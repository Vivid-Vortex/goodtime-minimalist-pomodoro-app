# Developer Guide — Pomodoro Auto

> **Purpose:** This document covers every layer you must touch when adding a new field, form, section, label, setting, or screen to this app. Written for use with AI coding agents — a prompt template is provided at the end.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Complete Data Flow Diagram](#2-complete-data-flow-diagram)
3. [Layer-by-Layer Reference](#3-layer-by-layer-reference)
   - [3.1 Firestore Schema](#31-firestore-schema)
   - [3.2 Room Local Database](#32-room-local-database)
   - [3.3 AppSettings / DataStore](#33-appsettings--datastore)
   - [3.4 Repository Layer](#34-repository-layer)
   - [3.5 ViewModel Layer](#35-viewmodel-layer)
   - [3.6 UI / Compose Layer](#36-ui--compose-layer)
   - [3.7 Dependency Injection (Koin)](#37-dependency-injection-koin)
   - [3.8 String Resources](#38-string-resources)
   - [3.9 Navigation](#39-navigation)
4. [Change Checklists](#4-change-checklists)
   - [4.1 Adding a New App Setting](#41-adding-a-new-app-setting)
   - [4.2 Adding a New Label / Tag Category (Cloud Sync)](#42-adding-a-new-label--tag-category-cloud-sync)
   - [4.3 Adding a New Field to the Firestore Timesheet](#43-adding-a-new-field-to-the-firestore-timesheet)
   - [4.4 Adding a New Room DB Column](#44-adding-a-new-room-db-column)
   - [4.5 Adding a New Screen](#45-adding-a-new-screen)
   - [4.6 Adding a New Repository](#46-adding-a-new-repository)
   - [4.7 Adding a UI-Only Form Field (no persistence)](#47-adding-a-ui-only-form-field-no-persistence)
5. [Key File Map](#5-key-file-map)
6. [tagSnapshot → formData Mapping — Deep Dive](#6-tagsnapshot--formdata-mapping--deep-dive)
7. [Version & Release Process](#7-version--release-process)
8. [Agent Prompt Template](#8-agent-prompt-template)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Android App                                │
│                                                                     │
│  Compose UI  ──►  ViewModel  ──►  Repository  ──►  Room DB (local) │
│                        │                │                           │
│                        │                └──►  DataStore (settings)  │
│                        │                                            │
│                        └──►  FirestoreSyncHandler ──►  Firestore    │
│                                    (androidMain only)               │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural facts:**
- **Kotlin Multiplatform (KMP)** — shared business logic lives in `shared/src/commonMain`; Android-specific code in `shared/src/androidMain` and `androidApp/`
- **Compose UI** — all Android UI is Jetpack Compose + Material 3
- **Room** — local SQLite via Room for session/label/profile storage
- **DataStore Preferences** — for all app settings (not Room)
- **Koin** — dependency injection throughout
- **Firestore** — cloud storage; only the Android target has a `FirestoreSyncHandler` implementation
- **No automatic Firestore sync** — data flows to cloud only on explicit user push or midnight auto-push

---

## 2. Complete Data Flow Diagram

### Timer Session → Cloud

```
User runs timer (tag: "W1M", 25 min)
        │
        ▼
TimerManager.finish() / skip()
        │
        ▼
FinishedSessionsHandler.saveSession()
        │  Creates LocalSession { labelName="W1M", duration=25, notes="" }
        ▼
Room DB  ─────────────────────────────────────────────
  table: localSession                                 │
  id | timestamp | duration | labelName | notes | ... │
  ──────────────────────────────────────────────────  │
                                                      │
 User presses "Save to cloud" (or midnight hits)      │
        │                                             │
        ▼                                             │
BackupViewModel.syncWithFirestore()                   │
        │                                             │
        ▼                                             │
FirestoreSyncHandler.syncData()                       │
  1. SELECT all sessions WHERE notes NOT LIKE '%cloud_synced_at%'
  2. Group by (date, labelName): { ("03-11-2025","W1M") → 25 min }
  3. For each group → replaceInTimesheet(dateKey, "W1M", 25)
  4. Mark session synced: UPDATE notes = notes + "[cloud_synced_at:...]"
        │
        ▼
  replaceInTimesheet("03-11-2025", "W1M", 25)
        │
        ▼
  Fetch Firestore doc: timesheet_entries/03-11-2025
        │
        ├── EXISTS → read formData.tagSnapshot
        │            find key where value == "W1M"  →  key = "work1Main"
        │            Firestore UPDATE: formData.work1Main += 25
        │
        └── NOT EXISTS → createNewTimesheetDocument()
                         Full JSON structure pushed with work1Main = 25

Also pushed to: pomodoro_app_history/03-11-2025
  sessions array gets new entry { label:"W1M", duration:25, deviceName:... }
```

### Settings Flow

```
User toggles setting in UI
        │
        ▼
ViewModel.setXxx(value)
        │
        ▼
SettingsRepository.setXxx(value)
        │
        ▼
DataStore.edit { prefs[key] = value }
        │
        ▼
settingsRepo.settings: Flow<AppSettings>  (emits new value)
        │
        ▼
ViewModel.uiState updated via .collect { }
        │
        ▼
Compose UI recomposes
```

---

## 3. Layer-by-Layer Reference

### 3.1 Firestore Schema

**Handler file:**
`shared/src/androidMain/kotlin/com/apps/adrcotfas/goodtime/data/local/backup/FirestoreSyncHandler.android.kt`

#### Collections

| Collection | Document ID | Purpose |
|-----------|-------------|---------|
| `timesheet_entries` | `DD-MM-YYYY` | Aggregated daily minutes per tag |
| `pomodoro_app_history` | `DD-MM-YYYY` | Raw per-device session history |
| `global_notes` | `timer_profile` | Timer profile definitions |

#### `timesheet_entries` document structure

```jsonc
{
  "id": "03-11-2025",
  "createdAt": 1730592000000,        // epoch millis for the date
  "formData": {
    "entryDate": 1730592000000,

    // tagSnapshot: maps formData field key → label code
    // This is the lookup table for the sync logic
    "tagSnapshot": {
      "avdhanaMode":       "AV",
      "wcmn":              "WCMN",
      "work3":             "W3",
      "work4":             "W4",
      "work2":             "W2",
      "work5":             "W5",
      "ltg":               "LTG",
      "timeWasted":        "TW",
      "essentials":        "ESS",
      "finance":           "FIN",
      "others":            "OTH",
      "work1Main":         "W1M",
      "work1Misc":         "W1X",
      "projectManagement": "PM",
      "learning":          "LRN",
      "meditation":        "MED",
      "exercise":          "EXE"
    },

    // ── Integer fields (minutes) ──────────────────────────────────
    "avdhanaMode":         0,
    "work1ToWork4Ikigai":  0,   // maps to tagSnapshot key "wcmn"
    "work3Udemy":          0,   // maps to tagSnapshot key "work3"
    "work4TechWebsite":    0,   // maps to tagSnapshot key "work4"
    "work2Youtube":        0,   // maps to tagSnapshot key "work2"
    "work5OnlineSale":     0,   // maps to tagSnapshot key "work5"
    "ltgLongTermGoal":     0,   // maps to tagSnapshot key "ltg"
    "timeWasted":          0,
    "spentOnEssentials":   0,   // maps to tagSnapshot key "essentials"
    "finance":             0,
    "others":              0,
    "work1Main":           0,
    "work1Misc":           0,
    "projectManagement":   0,
    "learning":            0,
    "meditation":          0,
    "exercise":            0,
    "sprint":              0,
    "approxWastedMinutes": 0,
    "overallHealthStatus": 1,

    // ── String fields ─────────────────────────────────────────────
    "intoxNo":             "N/A",
    "mbtNo":               "N/A",
    "topPriorityTime":     "",
    "topPriorityThinking": "N/A",
    "issue":               "NONE",
    "issueOtherText":      "",
    "dayProductivity":     "PRODUCTIVE",
    "total":               "",
    "relaxationAfter2Sprints": "",
    "sleepPhase1":         "",
    "sleepPhase2":         "",
    "pppw":                "",
    "tppw":                "",
    "entertainment":       "",
    "activity1":           "",
    "activity2":           "",
    "activity3":           "",
    "activity4":           "",
    "activity5":           "",

    // ── Boolean fields ────────────────────────────────────────────
    "playedFirstThingComesToMindGame": false,
    "thinking":            true,
    "onTimeSleep":         false,
    "mpvOfSleep":          false,
    "wakedUpAt4Am":        false,
    "selfAndSurroundingVastu": false,
    "twentyMinsLearning":  false,
    "thirtyMinsMeditation": false,
    "sixtyMinsExercise":   false,
    "phase2Sleep":         false,
    "minimum270Min":       false,
    "timePocketFollowed":  false,
    "youtubeTimeUtilizerDocFollowed": false,
    "wastedMoreThan15Mins": false,
    "pomodoroFollowed":    false,
    "mitsCompletedWithin270To360Mins": false,
    "completed270MinsBeforeSixPm": false,
    "ableToCompleteDaysMits": false,
    "carpeMomentum1440FollowedToday": false,
    "timePocketFollowedToday": false,
    "productivityPointsSuccessDocFollowed": false,
    "anchorPoints":        false,
    "sitStraightFor2Sprints": false,
    "didEverythingTimeBound": false,
    "followed4To4Policy":  false,
    "ateBreakfastDistractionFree": false,
    "satOnTimeAfterDWT3":  false
  }
}
```

#### `pomodoro_app_history` document structure

```jsonc
{
  "id": "03-11-2025",
  "createdAt": 1730592000000,
  "sessions": [
    {
      "id": 42,
      "timestamp": 1730592000000,
      "duration": 25,               // minutes
      "label": "W1M",               // label code (tag)
      "notes": "",
      "deviceName": "Pixel 8 Pro",
      "syncedAt": 1730592300000
    }
  ]
}
```

---

### 3.2 Room Local Database

**Database definition:**
`shared/src/commonMain/kotlin/com/apps/adrcotfas/goodtime/data/local/Database.kt`

Current schema version: **10**

#### Tables

| Table | Entity File | Purpose |
|-------|-------------|---------|
| `localSession` | `LocalSession.kt` | Every timer session run by the user |
| `localLabel` | `LocalLabel.kt` | Label/tag definitions |
| `localTimerProfile` | `LocalTimerProfile.kt` | Timer profile presets |

#### `LocalSession` columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | Long (PK autoGen) | |
| `timestamp` | Long | epoch millis when session started |
| `duration` | Long | minutes |
| `interruptions` | Long | minutes paused |
| `labelName` | String | FK → localLabel.name |
| `notes` | String | free text; sync uses `[cloud_synced_at:…]` marker |
| `isWork` | Boolean | true = focus, false = break |
| `isArchived` | Boolean | soft delete |

#### Adding a column to Room

1. Add the field to the entity data class with `@ColumnInfo(defaultValue = "…")`
2. Increment `@Database(version = N+1)`
3. Add `MIGRATION_N_N+1` in `Migrations.kt`:
   ```kotlin
   val MIGRATION_10_11 = object : Migration(10, 11) {
       override fun migrate(connection: SQLiteConnection) {
           connection.execSQL(
               "ALTER TABLE localSession ADD COLUMN myNewField TEXT NOT NULL DEFAULT ''"
           )
       }
   }
   ```
4. Add the migration to the `MIGRATIONS` array in `Database.kt`
5. Update `ModelMappingExt.kt` to map the new column to/from the domain model

**Migration files:**
`shared/src/commonMain/kotlin/com/apps/adrcotfas/goodtime/data/local/migrations/Migrations.kt`

---

### 3.3 AppSettings / DataStore

All **user preferences** (not session data) are stored in DataStore Preferences — not Room.

**Key files:**

| File | Purpose |
|------|---------|
| `shared/…/data/settings/AppSettings.kt` | Data class with all settings + nested data classes |
| `shared/…/data/settings/SettingsRepository.kt` | Interface |
| `shared/…/data/settings/SettingsRepositoryImpl.kt` | DataStore implementation |

#### How a setting is stored

```kotlin
// 1. AppSettings.kt — add field with default
data class AppSettings(
    ...
    val myNewFlag: Boolean = false,   // ← add here
)

// 2. SettingsRepositoryImpl.kt — add key in Keys object
private object Keys {
    ...
    val myNewFlagKey = booleanPreferencesKey("myNewFlagKey")   // ← unique string key
}

// 3. SettingsRepositoryImpl.kt — map in the settings Flow
override val settings: Flow<AppSettings> = dataStore.data.map { prefs ->
    AppSettings(
        ...
        myNewFlag = prefs[Keys.myNewFlagKey] ?: default.myNewFlag,   // ← add mapping
    )
}

// 4. SettingsRepository.kt — add to interface
suspend fun setMyNewFlag(enabled: Boolean)   // ← add to interface

// 5. SettingsRepositoryImpl.kt — implement
override suspend fun setMyNewFlag(enabled: Boolean) {
    dataStore.edit { it[Keys.myNewFlagKey] = enabled }
}
```

#### Complex settings (objects/enums)

Serialize to JSON string using `kotlinx.serialization`:
```kotlin
// In AppSettings — annotate the nested class
@Serializable
data class MyComplexSetting(val a: Int = 0, val b: String = "")

// Key as String
val myComplexSettingKey = stringPreferencesKey("myComplexSettingKey")

// Serialize on write
dataStore.edit {
    it[Keys.myComplexSettingKey] = Json.encodeToString(value)
}

// Deserialize on read
myComplexSetting = prefs[Keys.myComplexSettingKey]
    ?.let { Json.decodeFromString<MyComplexSetting>(it) }
    ?: default.myComplexSetting
```

---

### 3.4 Repository Layer

**Repositories in the shared module:**

| Interface | Impl | Manages |
|-----------|------|---------|
| `LocalDataRepository` | `LocalDataRepositoryImpl` | Room sessions, labels, profiles |
| `SettingsRepository` | `SettingsRepositoryImpl` | DataStore settings |
| `BackupManager` | `AndroidBackupManager` | Local file backup |
| `FirestoreSyncHandler` | `FirestoreSyncHandler.android.kt` | Firestore push/pull |

**Pattern — adding a method to LocalDataRepository:**

```kotlin
// 1. Interface (commonMain)
interface LocalDataRepository {
    ...
    fun getMyNewData(): Flow<List<MyData>>
    suspend fun insertMyData(data: MyData)
}

// 2. Implementation (commonMain)
class LocalDataRepositoryImpl(private val db: ProductivityDatabase) : LocalDataRepository {
    override fun getMyNewData(): Flow<List<MyData>> =
        db.myNewDao().getAll()

    override suspend fun insertMyData(data: MyData) =
        db.myNewDao().insert(data.toLocal())
}
```

---

### 3.5 ViewModel Layer

All ViewModels use this pattern:

```kotlin
// State
data class MyScreenUiState(
    val isLoading: Boolean = true,
    val myField: String = "",
    val myList: List<Item> = emptyList(),
)

// ViewModel
class MyScreenViewModel(
    private val repo: LocalDataRepository,
    private val settingsRepo: SettingsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyScreenUiState())
    val uiState = _uiState
        .onStart { loadData() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MyScreenUiState())

    private fun loadData() {
        viewModelScope.launch {
            repo.getMyNewData()
                .combine(settingsRepo.settings) { data, settings -> data to settings }
                .collect { (data, settings) ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            myList = data,
                            myField = settings.myNewFlag.toString(),
                        )
                    }
                }
        }
    }

    fun onToggleMyFlag(enabled: Boolean) {
        viewModelScope.launch { settingsRepo.setMyNewFlag(enabled) }
    }
}
```

**Existing ViewModels:**

| ViewModel | Where used |
|-----------|-----------|
| `TimerViewModel` | Main timer screen |
| `BackupViewModel` | Backup & Firestore sync |
| `StatisticsViewModel` | Statistics tabs |
| `LabelsViewModel` | Label management |
| `SettingsViewModel` | Settings screen |
| `MainViewModel` | App-level state (updates, permissions) |

---

### 3.6 UI / Compose Layer

**File locations:**

```
androidApp/src/main/java/com/apps/adrcotfas/goodtime/
├── main/
│   ├── MainScreen.kt          ← Timer screen
│   ├── TimerSection.kt        ← Timer display + auto-start break toggle
│   ├── BottomAppBar.kt        ← Bottom bar with label selector
│   └── MainNavigationSheet.kt ← Side-sheet navigation menu
├── stats/
│   ├── StatisticsScreen.kt    ← Tab container
│   ├── OverviewTab.kt         ← Summary cards
│   ├── AggregatedTimelineTab.kt  ← Cloud-fetched aggregated data
│   ├── AppHistoryTab.kt       ← Per-device raw history
│   └── TimelineTab.kt         ← Local timeline
├── settings/
│   ├── SettingsScreen.kt      ← Main settings list
│   ├── backup/
│   │   └── BackupScreen.kt    ← Backup & cloud sync
│   └── timerstyle/
│       └── TimerStyleScreen.kt
├── labels/
│   └── LabelsScreen.kt
└── ui/common/
    ├── ListItem.kt            ← SwitchListItem, CheckboxListItem, etc.
    ├── TopBar.kt
    └── ...
```

**Reusable list-item components** (in `ui/common/ListItem.kt`):

| Component | Use for |
|-----------|---------|
| `SwitchListItem` | Boolean toggle |
| `CheckboxListItem` | Checkbox with title + subtitle |
| `DropdownMenuListItem` | Select from a list |
| `SliderListItem` | Numeric range |
| `BetterListItem` | Clickable row with title/subtitle |
| `CircularProgressListItem` | Action button with loading state |

**Example — adding a new setting row to SettingsScreen:**

```kotlin
// In SettingsScreen.kt — read state
val myFlag = settings.myNewFlag

// Render
SwitchListItem(
    title = stringResource(R.string.settings_my_new_flag_title),
    subtitle = stringResource(R.string.settings_my_new_flag_desc),
    checked = myFlag,
    onCheckedChange = { viewModel.onToggleMyFlag(it) },
)
```

---

### 3.7 Dependency Injection (Koin)

**Module files:**

| File | Scope |
|------|-------|
| `shared/…/di/AppModule.kt` | commonMain — repositories, coroutine scopes |
| `shared/…/di/AppModule.android.kt` | androidMain — platform implementations |
| `shared/…/di/ViewModelModule.android.kt` | Android ViewModels |
| `shared/…/di/FirestoreModule.android.kt` | Firestore handler |
| `androidApp/…/di/WorkerModule.kt` | WorkManager workers |

**Adding a new ViewModel:**
```kotlin
// ViewModelModule.android.kt
actual val viewModelModule: Module = module {
    ...
    viewModelOf(::MyNewViewModel)   // if all deps auto-resolved
    // OR explicit:
    viewModel { MyNewViewModel(get(), get()) }
}
```

**Adding a new singleton repository:**
```kotlin
// AppModule.kt — coreModule
single<MyRepository> {
    MyRepositoryImpl(
        get<LocalDataRepository>(),
        getWith("MyRepository"),     // Logger with tag
    )
}
```

**Injecting in a Composable:**
```kotlin
val viewModel: MyNewViewModel = koinViewModel()   // in @Composable
// OR
val repo: MyRepository = koinInject()
```

**Injecting in a Worker:**
```kotlin
class MyWorker(...) : CoroutineWorker(...), KoinComponent {
    private val myRepo: MyRepository by inject()
}
```

---

### 3.8 String Resources

**Default (English) strings:**
```
shared/src/main/res/values/
├── strings_main.xml       ← timer screen, labels
├── strings_stats.xml      ← statistics
├── strings_backup.xml     ← backup & cloud sync
├── strings_settings.xml   ← settings
├── strings_labels.xml     ← label management
├── strings_intro.xml      ← onboarding
└── strings_support.xml    ← support/about
```

**Rule:** Always add new strings to the appropriate `values/strings_*.xml`. Do not add translations — Crowdin handles that.

```xml
<!-- Example: adding to strings_settings.xml -->
<string name="settings_my_new_flag_title">My new feature</string>
<string name="settings_my_new_flag_desc">Enable this to do something useful</string>
```

---

### 3.9 Navigation

**Navigation entry points:**
- `MainNavigationSheet.kt` — side-sheet with menu items
- `MainActivity.kt` — root NavHost definition

**Adding a new screen destination:**

```kotlin
// 1. Define destination (in Navigation.kt or near the screen file)
object MyNewScreenDest

// 2. Add to NavHost (MainActivity or AppNavGraph)
composable<MyNewScreenDest> {
    MyNewScreen(
        onNavigateBack = { navController.popBackStack() },
    )
}

// 3. Add menu item in MainNavigationSheet.kt
NavigationSheetItem(
    icon = { Icon(EvaIcons.Outline.MyIcon, contentDescription = null) },
    label = stringResource(R.string.my_new_screen_title),
    onClick = {
        navController.navigate(MyNewScreenDest)
        onHideSheet()
    },
)
```

---

## 4. Change Checklists

### 4.1 Adding a New App Setting

_Example: "Show session count on lock screen" (Boolean)_

- [ ] **`AppSettings.kt`** — add field with default value
- [ ] **`SettingsRepositoryImpl.kt › Keys`** — add `booleanPreferencesKey("uniqueKey")`
- [ ] **`SettingsRepositoryImpl.kt › settings Flow`** — map the key
- [ ] **`SettingsRepository.kt`** — add `suspend fun setXxx(value: Boolean)` to interface
- [ ] **`SettingsRepositoryImpl.kt`** — implement the setter
- [ ] **`SettingsViewModel.kt`** (or relevant VM) — expose state, add action method
- [ ] **`SettingsScreen.kt`** (or relevant screen) — add `SwitchListItem` / `CheckboxListItem`
- [ ] **`strings_settings.xml`** — add title + subtitle strings

---

### 4.2 Adding a New Label / Tag Category (Cloud Sync)

_Example: Adding a new tag "HEALTH" with code "HLT"_

- [ ] **`FirestoreSyncHandler.android.kt › createBaseTimesheetStructure()`**
  - Add to `tagSnapshot` map: `"health" to "HLT"`
  - Add outer field (integer): `"health" to 0`

- [ ] **`FirestoreSyncHandler.android.kt › tagSnapshotKeyToFieldNames`**
  - Add: `"health" to listOf("health")`
  - If you use a long-form name: `"health" to listOf("healthMinutes", "health")`

- [ ] **Room DB** — No schema change needed. Just create a `LocalLabel` with `name = "HLT"` via the Labels UI or a migration seed.

- [ ] **Statistics UI** — Add display in `AggregatedTimelineTab.kt` or `OverviewTab.kt` if you want to show this tag's data on-screen.

- [ ] **strings_labels.xml** (optional) — add display name string.

> **Note:** The Firestore document for a date is created automatically on first push if it doesn't exist. Existing documents get the new field added on next push via `update()`.

---

### 4.3 Adding a New Field to the Firestore Timesheet

_Example: Adding `"deepWorkScore": 0` (integer) not tied to a label_

These are non-tag fields — things like productivity scores, mood, booleans etc.

- [ ] **`FirestoreSyncHandler.android.kt › createBaseTimesheetStructure()`**
  - Add the field in `formData` with its default: `"deepWorkScore" to 0`

- [ ] **`FirestoreSyncHandler.android.kt › fetchFromCloud()`**
  - If you want to read it back, extract it from `formData`:
    ```kotlin
    val deepWorkScore = (formData["deepWorkScore"] as? Number)?.toInt() ?: 0
    ```

- [ ] **`BackupViewModel.kt`** — if this field should be displayed or edited in the app, expose it in `BackupUiState` or a dedicated ViewModel

- [ ] **UI** — add a form field wherever the user should enter/view this value

- [ ] **Firestore console** — no schema registration needed; Firestore is schemaless

> **Important:** Fields that already exist in Firestore documents are NOT automatically updated when you add them to `createBaseTimesheetStructure`. Existing documents only get new fields when a `syncData()` is called and the session for that date is being written. Old documents missing the field will return `null` on read — always use `?: default`.

---

### 4.4 Adding a New Room DB Column

_Example: Adding `moodScore: Int` to sessions_

- [ ] **`LocalSession.kt`** — add field:
  ```kotlin
  @ColumnInfo(defaultValue = "0")
  val moodScore: Int = 0,
  ```

- [ ] **`Database.kt`** — bump version: `@Database(version = 11, …)`

- [ ] **`Migrations.kt`** — add migration:
  ```kotlin
  val MIGRATION_10_11 = object : Migration(10, 11) {
      override fun migrate(connection: SQLiteConnection) {
          connection.execSQL(
              "ALTER TABLE localSession ADD COLUMN moodScore INTEGER NOT NULL DEFAULT 0"
          )
      }
  }
  ```

- [ ] **`Database.kt`** — add migration to builder:
  ```kotlin
  .addMigrations(…, MIGRATION_10_11)
  ```

- [ ] **`ModelMappingExt.kt`** — update `toLocal()` / `toDomain()` mapping functions

- [ ] **`SessionDao.kt`** — update any relevant queries if filtering/sorting by the new field

- [ ] **`LocalDataRepository.kt` + impl** — expose new field through repository if needed

- [ ] **ViewModel + UI** — surface the field in relevant screens

---

### 4.5 Adding a New Screen

_Example: A "Goals" screen_

- [ ] **Create Composable:**
  `androidApp/…/goals/GoalsScreen.kt`

- [ ] **Create ViewModel** (if needed):
  `shared/…/goals/GoalsViewModel.kt`

- [ ] **Register ViewModel in Koin:**
  `shared/…/di/ViewModelModule.android.kt` → `viewModelOf(::GoalsViewModel)`

- [ ] **Define navigation destination:**
  ```kotlin
  @Serializable object GoalsDest
  ```

- [ ] **Add to NavHost** (`MainActivity.kt` or app graph):
  ```kotlin
  composable<GoalsDest> {
      GoalsScreen(onNavigateBack = { navController.popBackStack() })
  }
  ```

- [ ] **Add menu item** in `MainNavigationSheet.kt`

- [ ] **Add strings** in `strings_main.xml` or a new `strings_goals.xml`

- [ ] **Add icon** — use a Compose Icons `EvaIcons` or add a vector drawable to `shared/src/main/res/drawable/`

---

### 4.6 Adding a New Repository

_Example: A `GoalsRepository` backed by Room_

- [ ] **Create entity** (if new table): `LocalGoal.kt` + `@Entity`
- [ ] **Create DAO**: `GoalDao.kt` with `@Dao`
- [ ] **Register in `Database.kt`**: add entity to `@Database(entities = […, LocalGoal::class])`, add `abstract fun goalDao(): GoalDao`
- [ ] **Add migration** (new table = `CREATE TABLE`; see section 4.4)
- [ ] **Create interface**: `GoalsRepository.kt` in `commonMain`
- [ ] **Create implementation**: `GoalsRepositoryImpl.kt`
- [ ] **Register in Koin** (`AppModule.kt`):
  ```kotlin
  single<GoalsRepository> { GoalsRepositoryImpl(get()) }
  ```
- [ ] **Inject into ViewModel** via constructor

---

### 4.7 Adding a UI-Only Form Field (no persistence)

_Example: A temporary filter on the Statistics screen_

- [ ] Add field to the screen's `UiState` data class
- [ ] Add a setter/action in the ViewModel using `_uiState.update { it.copy(…) }`
- [ ] Add the Compose UI widget (Text field, Slider, Dropdown, etc.)
- [ ] Add string resources if the label is user-visible

No DB, DataStore, Firestore, or migration changes needed.

---

## 5. Key File Map

```
goodtime-minimalist-pomodoro-app/
│
├── version.properties                          ← VERSION_CODE + VERSION_NAME (edit for releases)
├── .github/workflows/build-release.yml        ← GitHub Actions CI/CD
│
├── androidApp/
│   └── src/main/java/com/apps/adrcotfas/goodtime/
│       ├── MainActivity.kt                     ← NavHost root
│       ├── main/
│       │   ├── MainScreen.kt                   ← Timer UI
│       │   ├── TimerSection.kt                 ← Timer display + auto-start break toggle
│       │   └── MainNavigationSheet.kt          ← Navigation drawer
│       ├── stats/
│       │   ├── StatisticsScreen.kt
│       │   ├── OverviewTab.kt
│       │   ├── AggregatedTimelineTab.kt        ← Cloud data display
│       │   └── AppHistoryTab.kt
│       ├── settings/
│       │   ├── SettingsScreen.kt
│       │   └── backup/BackupScreen.kt          ← Cloud sync UI
│       ├── backup/
│       │   ├── AutoBackupManager.kt            ← Midnight scheduler
│       │   └── AutoBackupWorker.kt             ← WorkManager worker
│       ├── bl/
│       │   └── TimerService.kt                 ← Foreground service
│       └── ui/common/
│           └── ListItem.kt                     ← Reusable UI components
│
└── shared/
    ├── src/commonMain/kotlin/com/apps/adrcotfas/goodtime/
    │   ├── bl/
    │   │   ├── TimerManager.kt                 ← Core timer logic
    │   │   ├── DomainTimerData.kt              ← Timer state types
    │   │   └── FinishedSessionsHandler.kt      ← Saves completed sessions
    │   ├── data/
    │   │   ├── local/
    │   │   │   ├── Database.kt                 ← Room DB definition + version
    │   │   │   ├── LocalSession.kt             ← Session entity
    │   │   │   ├── LocalLabel.kt               ← Label entity
    │   │   │   ├── LocalTimerProfile.kt        ← Timer profile entity
    │   │   │   ├── migrations/Migrations.kt    ← DB migrations
    │   │   │   ├── LocalDataRepository.kt      ← Repository interface
    │   │   │   └── backup/BackupViewModel.kt   ← Backup + Firestore VM
    │   │   ├── model/                          ← Domain models
    │   │   └── settings/
    │   │       ├── AppSettings.kt              ← All settings data classes
    │   │       ├── SettingsRepository.kt       ← Interface
    │   │       └── SettingsRepositoryImpl.kt   ← DataStore implementation
    │   ├── main/
    │   │   └── TimerViewModel.kt               ← Timer screen VM
    │   └── di/
    │       └── AppModule.kt                    ← Koin modules (common)
    │
    ├── src/androidMain/kotlin/com/apps/adrcotfas/goodtime/
    │   ├── data/local/backup/
    │   │   └── FirestoreSyncHandler.android.kt ← ALL Firestore logic
    │   └── di/
    │       ├── AppModule.android.kt            ← Android Koin modules
    │       ├── ViewModelModule.android.kt      ← ViewModel registrations
    │       └── FirestoreModule.android.kt      ← Firestore DI
    │
    └── src/main/res/values/
        ├── strings_main.xml
        ├── strings_stats.xml
        ├── strings_backup.xml
        └── strings_settings.xml
```

---

## 6. tagSnapshot → formData Mapping — Deep Dive

This is the most complex part of the codebase. Understanding it is critical before touching any cloud sync logic.

### The two-level structure

```
tagSnapshot (inside formData):
  KEY (field name)   →   VALUE (label code)
  "work1Main"        →   "W1M"
  "essentials"       →   "ESS"

Outer formData fields:
  KEY (field name)   →   VALUE (integer minutes)
  "work1Main"        →   25
  "spentOnEssentials" →  45
```

Notice that `tagSnapshot.key` and the outer field name are **sometimes the same** (e.g. `"work1Main"`) and **sometimes different** (e.g. tagSnapshot key `"essentials"` but outer field `"spentOnEssentials"`).

### Push flow (syncData → replaceInTimesheet)

```kotlin
// Given: label code = "ESS", totalMinutes = 45

// Step 1: Fetch the document
val tagSnapshot = formData["tagSnapshot"] as Map<*, *>

// Step 2: Find the tagSnapshot KEY whose VALUE == "ESS"
val fieldKey = tagSnapshot.entries
    .find { it.value == "ESS" }    // finds: ("essentials" → "ESS")
    ?.key as? String               // result: "essentials"

// Step 3: Update formData[fieldKey] ... but wait —
// The OUTER field might be "spentOnEssentials", not "essentials".
// FirestoreSyncHandler uses document.update("formData.$fieldKey", 45)
// So if tagSnapshot key == outer field name, this works directly.
// If they differ (long-form names), the tagSnapshot key must MATCH the outer field name.
```

**Rule:** The `tagSnapshot` key must exactly equal the outer `formData` field name for `update()` to work. The long-form names like `"work1ToWork4Ikigai"` only appear as the outer field — the `tagSnapshot` key for WCMN is `"wcmn"` and for the push to work, the outer field written is also `"wcmn"` (not the long form). The long-form names are legacy/third-party fields fetched as fallbacks.

### Pull flow (fetchFromCloud)

```kotlin
// tagSnapshotKeyToFieldNames maps tagSnapshot key → list of possible outer field names to try
val tagSnapshotKeyToFieldNames = mapOf(
    "wcmn" to listOf("work1ToWork4Ikigai", "wcmn"),   // try long form first
    "essentials" to listOf("spentOnEssentials", "essentials"),
    "work1Main" to listOf("work1Main"),                 // same name, single entry
    ...
)

// For each tag in tagSnapshot:
val tagCode = "WCMN"
val possibleFields = listOf("work1ToWork4Ikigai", "wcmn")

var minutes = 0
for (field in possibleFields) {
    val v = (formData[field] as? Number)?.toInt() ?: 0
    if (v > 0) { minutes = v; break }
}
// Result: minutes = whatever is in formData["work1ToWork4Ikigai"] or formData["wcmn"]
```

### Adding a new tag: complete example

Say you add tag **"HEALTH"** with code **"HLT"** and outer field name **"healthMinutes"**:

```kotlin
// In createBaseTimesheetStructure():

// tagSnapshot entry
"tagSnapshot" to hashMapOf(
    ...
    "healthMinutes" to "HLT",      // KEY must match the outer field name below
)

// Outer field (integer)
"healthMinutes" to 0,

// In tagSnapshotKeyToFieldNames (for pull):
"healthMinutes" to listOf("healthMinutes"),
```

---

## 7. Version & Release Process

### Files involved

| File | What to change |
|------|---------------|
| `version.properties` | `VERSION_NAME` for major/minor bumps |
| `androidApp/build.gradle.kts` | Reads from `version.properties` automatically |

`VERSION_CODE` is **auto-incremented by GitHub Actions** — never edit it manually.

### Release steps

```bash
# Push commits to dev
git push origin dev

# Tag the release (triggers GitHub Actions)
git tag v3.1.0
git push origin v3.1.0
```

GitHub Actions (`.github/workflows/build-release.yml`) then:
1. Increments `VERSION_CODE`, commits back
2. Builds `googleRelease` APK
3. Creates a GitHub Release with APK attached

---

## 8. Agent Prompt Template

Use this template when instructing an AI agent to make changes to this codebase.

---

```
## Task: [SHORT DESCRIPTION]

### Context
This is a Kotlin Multiplatform Android app (Pomodoro Auto, forked from Goodtime).
- Shared business logic: `shared/src/commonMain/`
- Android-specific code: `shared/src/androidMain/` + `androidApp/src/main/`
- UI: Jetpack Compose + Material 3
- Local storage: Room (sessions/labels/profiles) + DataStore (settings)
- Cloud storage: Firestore via FirestoreSyncHandler.android.kt
- DI: Koin (modules in `shared/src/*/di/`)
- Navigation: Compose Navigation with typed destinations

### What I want to add / change
[DESCRIBE THE FEATURE IN PLAIN ENGLISH]

Examples:
- "Add a new Boolean setting called 'showGoalBadge' that appears in the Settings screen under Timer section"
- "Add a new tag 'HEALTH' with code 'HLT' that syncs to cloud like existing tags"
- "Add a new integer field 'deepWorkScore' to the Firestore timesheet_entries document"
- "Add a new 'Goals' screen accessible from the navigation drawer"

### Constraints / rules (DO NOT violate these)
1. Do NOT change any files not listed in the checklist below
2. Do NOT rename or remove existing Firestore fields — only add new ones
3. Do NOT change Room schema without adding a migration (bump version N→N+1 in Database.kt)
4. Do NOT hardcode strings — add to the appropriate strings_*.xml
5. Do NOT use SharedPreferences — use DataStore for all settings
6. All new ViewModels must be registered in ViewModelModule.android.kt
7. All new Repository implementations must be registered in AppModule.kt
8. Do NOT modify gradle files unless explicitly asked

### Checklist of files to modify
Based on DEVELOPER_GUIDE.md, the files for this change are:

[ ] shared/src/commonMain/…/data/settings/AppSettings.kt
[ ] shared/src/commonMain/…/data/settings/SettingsRepository.kt
[ ] shared/src/commonMain/…/data/settings/SettingsRepositoryImpl.kt
[ ] shared/src/commonMain/…/data/local/Database.kt           (if Room change)
[ ] shared/src/commonMain/…/data/local/LocalSession.kt       (if Room column)
[ ] shared/src/commonMain/…/data/local/migrations/Migrations.kt  (if Room change)
[ ] shared/src/androidMain/…/data/local/backup/FirestoreSyncHandler.android.kt  (if cloud field)
[ ] shared/src/androidMain/…/di/ViewModelModule.android.kt   (if new ViewModel)
[ ] shared/src/commonMain/…/di/AppModule.kt                  (if new Repository)
[ ] androidApp/…/main/TimerViewModel.kt                      (if timer screen state changes)
[ ] androidApp/…/settings/SettingsScreen.kt                  (if new setting UI)
[ ] androidApp/…/settings/backup/BackupScreen.kt             (if backup UI change)
[ ] androidApp/…/main/MainNavigationSheet.kt                 (if new screen in nav)
[ ] androidApp/…/MainActivity.kt                             (if new NavHost destination)
[ ] shared/src/main/res/values/strings_*.xml                 (always, for UI text)

### Expected output
- Show all file diffs
- Compile-safe Kotlin (no unresolved references)
- Follow existing code style (no trailing whitespace, same import ordering, no extra blank lines)
- If touching Firestore, add a comment showing the resulting JSON structure change
- Do NOT add docstrings or comments unless the logic is non-obvious
```

---

### Tips for specific scenarios

**For a setting change only** — use this shorter prompt addition:
```
Only touch: AppSettings.kt, SettingsRepository.kt, SettingsRepositoryImpl.kt,
the relevant ViewModel, the relevant screen, and strings_settings.xml.
```

**For a Firestore schema change only:**
```
Only touch FirestoreSyncHandler.android.kt.
Show the before/after of the JSON structure in a comment.
Do not touch Room, DataStore, or UI files.
```

**For a new screen:**
```
Create the screen Composable, ViewModel, and Koin registration.
Wire navigation in MainNavigationSheet.kt and MainActivity.kt.
The screen should follow the same pattern as BackupScreen.kt.
```

**For a Room migration:**
```
Current Room version is [N]. Bump to [N+1].
Add MIGRATION_N_N+1 to Migrations.kt.
Register it in Database.kt addMigrations(...).
The SQL change is: [ALTER TABLE / CREATE TABLE / etc.]
```
