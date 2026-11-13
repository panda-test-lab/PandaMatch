use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs::{self, OpenOptions},
    io::{ErrorKind, Write},
    path::{Component, Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
struct SetsStorage(Mutex<Option<PathBuf>>);

#[derive(Default)]
struct ErrorLogLock(Mutex<()>);

const ERROR_LOG_MAX_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SetsStorageStatus {
    ready: bool,
    install_path: String,
    suggested_path: String,
    active_path: Option<String>,
}

fn storage_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|error| error.to_string())?;
    Ok(config_dir.join("sets-directory.json"))
}

fn save_storage_path(app: &tauri::AppHandle, sets_path: &Path) -> Result<(), String> {
    let path = storage_config_path(app)?;
    let contents = serde_json::json!({ "setsPath": sets_path });
    fs::write(
        path,
        serde_json::to_vec_pretty(&contents).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn check_writable(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| error.to_string())?;
    let probe = path.join(format!(".pandamatch-write-check-{}", std::process::id()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe)
        .map_err(|error| error.to_string())?;
    if let Err(error) = file.write_all(b"ok") {
        drop(file);
        let _ = fs::remove_file(&probe);
        return Err(error.to_string());
    }
    drop(file);
    fs::remove_file(probe).map_err(|error| error.to_string())
}

fn set_active_storage(
    app: &tauri::AppHandle,
    storage: &SetsStorage,
    sets_path: PathBuf,
) -> Result<String, String> {
    check_writable(&sets_path)?;
    save_storage_path(app, &sets_path)?;
    let displayed = sets_path.display().to_string();
    *storage.0.lock().map_err(|error| error.to_string())? = Some(sets_path);
    Ok(displayed)
}

fn active_storage(storage: &SetsStorage) -> Result<PathBuf, String> {
    storage
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .clone()
        .ok_or_else(|| "Der Sets-Speicherort wurde noch nicht eingerichtet.".to_string())
}

fn append_error_log(path: &Path, record: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let should_rotate = match fs::metadata(path) {
        Ok(metadata) => metadata.len() > ERROR_LOG_MAX_BYTES,
        Err(error) if error.kind() == ErrorKind::NotFound => false,
        Err(error) => return Err(error.to_string()),
    };
    if should_rotate {
        let backup = path.with_extension("log.1");
        if backup.exists() {
            fs::remove_file(&backup).map_err(|error| error.to_string())?;
        }
        fs::rename(path, backup).map_err(|error| error.to_string())?;
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| error.to_string())?;
    serde_json::to_writer(&mut file, record).map_err(|error| error.to_string())?;
    file.write_all(b"\n").map_err(|error| error.to_string())?;
    file.sync_data().map_err(|error| error.to_string())
}

#[tauri::command]
fn report_error(
    app: tauri::AppHandle,
    log_lock: State<'_, ErrorLogLock>,
    context: String,
    message: String,
    stack: Option<String>,
) -> Result<String, String> {
    let _guard = log_lock.0.lock().map_err(|error| error.to_string())?;
    let log_path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("error.log");
    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let record = serde_json::json!({
        "timestampUnixMs": timestamp_ms,
        "context": context,
        "message": message,
        "stack": stack,
    });

    append_error_log(&log_path, &record)?;
    Ok(log_path.display().to_string())
}

#[tauri::command]
fn initialize_sets_storage(
    app: tauri::AppHandle,
    storage: State<'_, SetsStorage>,
) -> Result<SetsStorageStatus, String> {
    #[cfg(mobile)]
    {
        let sets_path = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("Sets");
        let active_path = set_active_storage(&app, &storage, sets_path)?;
        return Ok(SetsStorageStatus {
            ready: true,
            install_path: String::new(),
            suggested_path: String::new(),
            active_path: Some(active_path),
        });
    }

    #[cfg(not(mobile))]
    {
        let config_path = storage_config_path(&app)?;
        if let Ok(config) = fs::read_to_string(config_path) {
            if let Ok(value) = serde_json::from_str::<Value>(&config) {
                if let Some(path) = value.get("setsPath").and_then(Value::as_str) {
                    let configured = PathBuf::from(path);
                    if check_writable(&configured).is_ok() {
                        *storage.0.lock().map_err(|error| error.to_string())? =
                            Some(configured.clone());
                        return Ok(SetsStorageStatus {
                            ready: true,
                            install_path: String::new(),
                            suggested_path: String::new(),
                            active_path: Some(configured.display().to_string()),
                        });
                    }
                }
            }
        }

        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        let install_dir = executable
            .parent()
            .ok_or_else(|| "Der Installationsordner konnte nicht ermittelt werden.".to_string())?;
        let install_sets = install_dir.join("Sets");
        if check_writable(&install_sets).is_ok() {
            let active_path = set_active_storage(&app, &storage, install_sets.clone())?;
            return Ok(SetsStorageStatus {
                ready: true,
                install_path: install_dir.display().to_string(),
                suggested_path: String::new(),
                active_path: Some(active_path),
            });
        }

        let documents_dir = app
            .path()
            .document_dir()
            .map_err(|error| error.to_string())?;
        let suggested_sets = documents_dir.join("PandaMatch").join("Sets");
        Ok(SetsStorageStatus {
            ready: false,
            install_path: install_dir.display().to_string(),
            suggested_path: suggested_sets.display().to_string(),
            active_path: None,
        })
    }
}

#[tauri::command]
fn accept_suggested_sets_storage(
    app: tauri::AppHandle,
    storage: State<'_, SetsStorage>,
) -> Result<String, String> {
    #[cfg(mobile)]
    {
        let sets_path = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("Sets");
        return set_active_storage(&app, &storage, sets_path);
    }

    #[cfg(not(mobile))]
    {
        let documents_dir = app
            .path()
            .document_dir()
            .map_err(|error| error.to_string())?;
        set_active_storage(
            &app,
            &storage,
            documents_dir.join("PandaMatch").join("Sets"),
        )
    }
}

#[tauri::command]
fn choose_sets_storage(
    app: tauri::AppHandle,
    storage: State<'_, SetsStorage>,
) -> Result<Option<String>, String> {
    #[cfg(mobile)]
    {
        let _ = (app, storage);
        return Err(
            "Auf Android und iOS kann kein Ordner ausgewählt werden. Die Sets liegen im App-Speicher."
                .to_string(),
        );
    }

    #[cfg(not(mobile))]
    {
        let selected = app
            .dialog()
            .file()
            .set_title("Speicherort für PandaMatch-Sets auswählen")
            .blocking_pick_folder();
        let Some(selected) = selected else {
            return Ok(None);
        };
        let parent = selected.into_path().map_err(|error| error.to_string())?;
        set_active_storage(&app, &storage, parent.join("Sets")).map(Some)
    }
}

fn safe_component(value: &str) -> String {
    let clean: String = value
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || matches!(character, ' ' | '-' | '_' | '.') {
                character
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = clean.trim_matches([' ', '.']);
    let shortened: String = trimmed.chars().take(80).collect();
    if shortened.is_empty() {
        "Kartenset".to_string()
    } else {
        shortened
    }
}

fn find_set_directory(root: &Path, id: &str) -> Result<Option<PathBuf>, String> {
    if !root.exists() {
        return Ok(None);
    }
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            continue;
        }
        let set_file = entry.path().join("set.json");
        if !set_file.is_file() {
            continue;
        }
        let value: Value =
            serde_json::from_slice(&fs::read(&set_file).map_err(|error| error.to_string())?)
                .map_err(|error| format!("Ungültige Set-Datei {}: {error}", set_file.display()))?;
        if value.get("id").and_then(Value::as_str) == Some(id) {
            return Ok(Some(entry.path()));
        }
    }
    Ok(None)
}

fn save_media(value: &mut Value, images_dir: &Path, index: &mut usize) -> Result<(), String> {
    match value {
        Value::Array(values) => {
            for child in values {
                save_media(child, images_dir, index)?;
            }
        }
        Value::Object(object) => {
            let kind = object.get("type").and_then(Value::as_str);
            let content = object.get("content").and_then(Value::as_str);
            if let (Some(kind), Some(content)) = (kind, content) {
                let media = if kind == "image" && content.starts_with("data:image/") {
                    let (header, encoded) = content.split_once(',').ok_or_else(|| {
                        "Ungültige eingebettete Bilddatei im Kartenset.".to_string()
                    })?;
                    let mime = header
                        .strip_prefix("data:")
                        .and_then(|value| value.strip_suffix(";base64"))
                        .ok_or_else(|| {
                            "Das Bildformat kann nicht exportiert werden.".to_string()
                        })?;
                    let extension = match mime {
                        "image/png" => "png",
                        "image/jpeg" => "jpg",
                        "image/webp" => "webp",
                        "image/gif" => "gif",
                        "image/svg+xml" => "svg",
                        _ => return Err(format!("Nicht unterstütztes Bildformat: {mime}")),
                    };
                    Some((
                        extension,
                        STANDARD
                            .decode(encoded)
                            .map_err(|error| error.to_string())?,
                    ))
                } else if kind == "svg" && content.trim_start().starts_with("<svg") {
                    Some(("svg", content.as_bytes().to_vec()))
                } else {
                    None
                };
                if let Some((extension, bytes)) = media {
                    *index += 1;
                    let filename = format!("grafik-{:04}.{extension}", *index);
                    fs::create_dir_all(images_dir).map_err(|error| error.to_string())?;
                    fs::write(images_dir.join(&filename), bytes)
                        .map_err(|error| error.to_string())?;
                    object.insert(
                        "content".to_string(),
                        Value::String(format!("Bilder/{filename}")),
                    );
                }
            }
            for child in object.values_mut() {
                save_media(child, images_dir, index)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn hydrate_media(value: &mut Value, set_dir: &Path) -> Result<(), String> {
    match value {
        Value::Array(values) => {
            for child in values {
                hydrate_media(child, set_dir)?;
            }
        }
        Value::Object(object) => {
            let kind = object.get("type").and_then(Value::as_str);
            let content = object.get("content").and_then(Value::as_str);
            if let (Some(kind), Some(content)) = (kind, content) {
                if (kind == "image" || kind == "svg")
                    && !content.starts_with("data:")
                    && !content.starts_with("http")
                    && !(kind == "svg" && content.trim_start().starts_with("<svg"))
                {
                    let relative = Path::new(content);
                    if relative.is_absolute()
                        || relative
                            .components()
                            .any(|component| !matches!(component, Component::Normal(_)))
                    {
                        return Err(format!("Unsicherer relativer Medienpfad: {content}"));
                    }
                    let file_path = set_dir.join(relative);
                    let canonical_dir =
                        set_dir.canonicalize().map_err(|error| error.to_string())?;
                    let canonical_file = file_path.canonicalize().map_err(|error| {
                        format!("Set-Medium {content} kann nicht gelesen werden: {error}")
                    })?;
                    if !canonical_file.starts_with(canonical_dir) {
                        return Err(format!(
                            "Set-Medium liegt außerhalb des Set-Ordners: {content}"
                        ));
                    }
                    let bytes = fs::read(&canonical_file).map_err(|error| error.to_string())?;
                    let replacement = if kind == "svg"
                        || canonical_file.extension().and_then(|ext| ext.to_str()) == Some("svg")
                    {
                        String::from_utf8(bytes).map_err(|error| error.to_string())?
                    } else {
                        let mime = match canonical_file
                            .extension()
                            .and_then(|ext| ext.to_str())
                            .unwrap_or_default()
                        {
                            "jpg" | "jpeg" => "image/jpeg",
                            "webp" => "image/webp",
                            "gif" => "image/gif",
                            _ => "image/png",
                        };
                        format!("data:{mime};base64,{}", STANDARD.encode(bytes))
                    };
                    object.insert("content".to_string(), Value::String(replacement));
                }
            }
            for child in object.values_mut() {
                hydrate_media(child, set_dir)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn read_imported_sets(path: &Path) -> Result<Vec<Value>, String> {
    let mut value: Value =
        serde_json::from_slice(&fs::read(path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Ungültige Set-Datei {}: {error}", path.display()))?;
    let parent = path
        .parent()
        .ok_or_else(|| "Der Set-Dateiordner fehlt.".to_string())?;
    hydrate_media(&mut value, parent)?;
    match value {
        Value::Array(sets) => Ok(sets),
        set => Ok(vec![set]),
    }
}

fn remove_set_media(value: &Value, set_dir: &Path) -> Result<(), String> {
    match value {
        Value::Array(values) => {
            for child in values {
                remove_set_media(child, set_dir)?;
            }
        }
        Value::Object(object) => {
            let kind = object.get("type").and_then(Value::as_str);
            let content = object.get("content").and_then(Value::as_str);
            if let (Some(kind), Some(content)) = (kind, content) {
                if (kind == "image" || kind == "svg") && content.starts_with("Bilder/") {
                    let relative = Path::new(content);
                    if relative.is_absolute()
                        || relative
                            .components()
                            .any(|component| !matches!(component, Component::Normal(_)))
                    {
                        return Err(format!("Unsicherer relativer Medienpfad: {content}"));
                    }
                    let file = set_dir.join(relative);
                    if file.exists() {
                        let canonical_dir =
                            set_dir.canonicalize().map_err(|error| error.to_string())?;
                        let canonical_file =
                            file.canonicalize().map_err(|error| error.to_string())?;
                        if !canonical_file.starts_with(canonical_dir) {
                            return Err(format!(
                                "Set-Medium liegt außerhalb des Set-Ordners: {content}"
                            ));
                        }
                        fs::remove_file(canonical_file).map_err(|error| error.to_string())?;
                    }
                }
            }
            for child in object.values() {
                remove_set_media(child, set_dir)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn remove_empty_set_directories(set_dir: &Path) {
    let images_dir = set_dir.join("Bilder");
    if fs::read_dir(&images_dir)
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(false)
    {
        let _ = fs::remove_dir(&images_dir);
    }
}

fn write_set_to_parent(parent: &Path, mut set: Value) -> Result<PathBuf, String> {
    let title = set
        .get("title")
        .and_then(Value::as_str)
        .ok_or_else(|| "Das Kartenset hat keinen gültigen Namen.".to_string())?;
    let id = set
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "Das Kartenset hat keine gültige ID.".to_string())?
        .to_string();
    let mut folder = parent.join(safe_component(title));
    if folder.join("set.json").is_file() {
        let existing: Value = serde_json::from_slice(
            &fs::read(folder.join("set.json")).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        if existing.get("id").and_then(Value::as_str) != Some(&id) {
            let suffix: String = id.chars().take(12).collect();
            folder = parent.join(format!(
                "{}--{}",
                safe_component(title),
                safe_component(&suffix)
            ));
        }
    }
    if let Some(previous) = find_set_directory(parent, &id)? {
        if previous != folder && !folder.exists() {
            fs::rename(previous, &folder).map_err(|error| error.to_string())?;
        } else if previous != folder {
            let previous_file = previous.join("set.json");
            if previous_file.is_file() {
                let previous_set: Value = serde_json::from_slice(
                    &fs::read(&previous_file).map_err(|error| error.to_string())?,
                )
                .map_err(|error| error.to_string())?;
                remove_set_media(&previous_set, &previous)?;
                fs::remove_file(previous_file).map_err(|error| error.to_string())?;
                remove_empty_set_directories(&previous);
            }
        }
    }
    if folder.exists() {
        let existing_set = folder.join("set.json");
        if existing_set.exists() {
            let existing: Value = serde_json::from_slice(
                &fs::read(&existing_set).map_err(|error| error.to_string())?,
            )
            .map_err(|error| error.to_string())?;
            if existing.get("id").and_then(Value::as_str) != Some(&id) {
                return Err(format!(
                    "Der Ordner {} enthält bereits ein anderes Kartenset.",
                    folder.display()
                ));
            }
            remove_set_media(&existing, &folder)?;
        }
    }
    fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
    let mut index = 0;
    save_media(&mut set, &folder.join("Bilder"), &mut index)?;
    let contents = serde_json::to_vec_pretty(&set).map_err(|error| error.to_string())?;
    fs::write(folder.join("set.json"), contents).map_err(|error| error.to_string())?;
    Ok(folder)
}

#[tauri::command]
fn load_saved_sets(storage: State<'_, SetsStorage>) -> Result<Vec<Value>, String> {
    let root = active_storage(&storage)?;
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut sets = Vec::new();
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            continue;
        }
        let set_file = entry.path().join("set.json");
        if set_file.is_file() {
            let mut set: Value =
                serde_json::from_slice(&fs::read(&set_file).map_err(|error| error.to_string())?)
                    .map_err(|error| {
                        format!("Ungültige Set-Datei {}: {error}", set_file.display())
                    })?;
            hydrate_media(&mut set, &entry.path())?;
            sets.push(set);
        }
    }
    Ok(sets)
}

#[tauri::command]
fn write_saved_set(set: Value, storage: State<'_, SetsStorage>) -> Result<String, String> {
    let root = active_storage(&storage)?;
    write_set_to_parent(&root, set).map(|path| path.display().to_string())
}

fn delete_saved_set_from_root(root: &Path, id: &str) -> Result<(), String> {
    if let Some(folder) = find_set_directory(root, id)? {
        let set_file = folder.join("set.json");
        let set: Value =
            serde_json::from_slice(&fs::read(&set_file).map_err(|error| error.to_string())?)
                .map_err(|error| error.to_string())?;
        remove_set_media(&set, &folder)?;
        fs::remove_file(set_file).map_err(|error| error.to_string())?;
        remove_empty_set_directories(&folder);
        if fs::read_dir(&folder)
            .map(|mut entries| entries.next().is_none())
            .unwrap_or(false)
        {
            fs::remove_dir(folder).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn delete_saved_set(id: String, storage: State<'_, SetsStorage>) -> Result<(), String> {
    let root = active_storage(&storage)?;
    delete_saved_set_from_root(&root, &id)
}

#[tauri::command]
fn import_sets_from_files(app: tauri::AppHandle) -> Result<Option<Vec<Value>>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("PandaMatch-Kartensets", &["json"])
        .set_title("Kartenset-Datei(en) importieren")
        .blocking_pick_files();
    let Some(files) = selected else {
        return Ok(None);
    };
    let mut imported = Vec::new();
    for file in files {
        let path = file.into_path().map_err(|error| error.to_string())?;
        imported.extend(read_imported_sets(&path)?);
    }
    Ok(Some(imported))
}

#[tauri::command]
fn export_set_to_file(set: Value, app: tauri::AppHandle) -> Result<Option<String>, String> {
    let title = set
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or("Kartenset");
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("PandaMatch-Kartenset", &["json"])
        .set_file_name(format!("{}.json", safe_component(title)))
        .set_title("Kartenset exportieren")
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|error| error.to_string())?;
    fs::write(
        &path,
        serde_json::to_vec_pretty(&set).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(Some(path.display().to_string()))
}

fn is_desktop_target() -> bool {
    !cfg!(any(target_os = "android", target_os = "ios"))
}

#[tauri::command]
fn is_desktop_app() -> bool {
    is_desktop_target()
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) -> Result<(), String> {
    if !is_desktop_target() {
        return Err(
            "Ein App-Neustart über den Updater ist nur auf dem Desktop verfügbar.".to_string(),
        );
    }
    app.restart()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(SetsStorage::default())
        .manage(ErrorLogLock::default())
        .plugin(tauri_plugin_dialog::init());
    #[cfg(not(mobile))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_sets_storage,
            accept_suggested_sets_storage,
            choose_sets_storage,
            load_saved_sets,
            write_saved_set,
            delete_saved_set,
            import_sets_from_files,
            export_set_to_file,
            report_error,
            is_desktop_app,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_log_appends_json_lines_and_rotates_large_logs() {
        let root =
            std::env::temp_dir().join(format!("pandamatch-error-log-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("temporary folder should be created");
        let path = root.join("error.log");
        let first = serde_json::json!({ "message": "first error" });
        let second = serde_json::json!({ "message": "second error" });

        append_error_log(&path, &first).expect("first error should be logged");
        append_error_log(&path, &second).expect("second error should be logged");
        let contents = fs::read_to_string(&path).expect("error log should be readable");
        let lines: Vec<Value> = contents
            .lines()
            .map(|line| serde_json::from_str(line).expect("each line should be valid JSON"))
            .collect();
        assert_eq!(lines, vec![first.clone(), second]);

        fs::write(&path, vec![b'x'; ERROR_LOG_MAX_BYTES as usize + 1])
            .expect("large log should be written");
        append_error_log(&path, &first).expect("large log should rotate");
        assert!(path.with_extension("log.1").is_file());
        assert_eq!(
            serde_json::from_str::<Value>(
                fs::read_to_string(&path)
                    .expect("new log should be readable")
                    .trim()
            )
            .expect("new log should contain a JSON record"),
            first
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn set_files_keep_media_separate_and_round_trip() {
        let root =
            std::env::temp_dir().join(format!("pandamatch-set-roundtrip-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let set = serde_json::json!({
          "id": "test-set",
          "title": "Test Set",
          "pairs": [{
        "id": "pair-1",
        "title": "Concept",
        "cardA": {
          "content": format!("data:image/webp;base64,{}", STANDARD.encode(b"image-bytes")),
          "type": "image",
          "label": "Picture"
        },
        "cardB": {
          "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
          "type": "svg",
          "label": "Drawing"
        }
          }]
        });

        let folder = write_set_to_parent(&root, set).expect("set should be written");
        let set_file = folder.join("set.json");
        let persisted: Value =
            serde_json::from_slice(&fs::read(&set_file).expect("set file should exist"))
                .expect("set file should contain JSON");
        let card_a_content = persisted["pairs"][0]["cardA"]["content"]
            .as_str()
            .expect("image path should be serialized");
        let card_b_content = persisted["pairs"][0]["cardB"]["content"]
            .as_str()
            .expect("svg path should be serialized");
        assert!(card_a_content.starts_with("Bilder/"));
        assert!(card_b_content.starts_with("Bilder/"));
        assert!(folder.join(card_a_content).is_file());
        assert!(folder.join(card_b_content).is_file());

        let mut loaded = persisted;
        hydrate_media(&mut loaded, &folder).expect("media should be resolved");
        assert_eq!(
            loaded["pairs"][0]["cardA"]["content"],
            format!("data:image/webp;base64,{}", STANDARD.encode(b"image-bytes"))
        );
        assert_eq!(
            loaded["pairs"][0]["cardB"]["content"],
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
        );

        delete_saved_set_from_root(&root, "test-set").expect("set should be deleted");
        assert!(!set_file.exists());
        assert!(!folder.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn same_named_sets_get_separate_directories() {
        let root =
            std::env::temp_dir().join(format!("pandamatch-set-collision-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);

        let first = serde_json::json!({ "id": "set-one", "title": "Gleiches Set" });
        let second = serde_json::json!({ "id": "set-two", "title": "Gleiches Set" });
        let first_folder = write_set_to_parent(&root, first).expect("first set should be written");
        let second_folder =
            write_set_to_parent(&root, second).expect("second set should be written");

        assert_ne!(first_folder, second_folder);
        assert!(first_folder.join("set.json").is_file());
        assert!(second_folder.join("set.json").is_file());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn portable_set_array_imports_embedded_graphics() {
        let root =
            std::env::temp_dir().join(format!("pandamatch-portable-import-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("temporary folder should be created");
        let file = root.join("sets.json");
        let portable_sets = serde_json::json!([
          {
            "id": "set-one",
            "title": "Portable Set",
            "pairs": [{
              "cardA": {
                "content": format!("data:image/png;base64,{}", STANDARD.encode(b"image-bytes")),
                "type": "image"
              },
              "cardB": {
                "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
                "type": "svg"
              }
            }]
          },
          { "id": "set-two", "title": "Second Set" }
        ]);
        fs::write(
            &file,
            serde_json::to_vec_pretty(&portable_sets).expect("portable sets should serialize"),
        )
        .expect("portable file should be written");

        let imported = read_imported_sets(&file).expect("portable sets should import");
        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0]["id"], "set-one");
        assert_eq!(
            imported[0]["pairs"][0]["cardA"]["content"],
            format!("data:image/png;base64,{}", STANDARD.encode(b"image-bytes"))
        );
        assert_eq!(
            imported[0]["pairs"][0]["cardB"]["content"],
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn portable_single_set_imports_embedded_graphics() {
        let root = std::env::temp_dir().join(format!(
            "pandamatch-single-set-import-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("temporary folder should be created");
        let file = root.join("portable-set.json");
        let portable_set = serde_json::json!({
          "id": "set-one",
          "title": "Portable Set",
          "pairs": [{
            "cardA": {
              "content": format!("data:image/png;base64,{}", STANDARD.encode(b"image-bytes")),
              "type": "image"
            },
            "cardB": {
              "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
              "type": "svg"
            }
          }]
        });
        fs::write(
            &file,
            serde_json::to_vec_pretty(&portable_set).expect("portable set should serialize"),
        )
        .expect("portable file should be written");

        let imported = read_imported_sets(&file).expect("portable set should import");
        assert_eq!(imported.len(), 1);
        assert_eq!(imported[0]["id"], "set-one");
        assert_eq!(
            imported[0]["pairs"][0]["cardA"]["content"],
            format!("data:image/png;base64,{}", STANDARD.encode(b"image-bytes"))
        );
        assert_eq!(
            imported[0]["pairs"][0]["cardB"]["content"],
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
        );
        let _ = fs::remove_dir_all(root);
    }
}
