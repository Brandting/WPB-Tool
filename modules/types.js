// ============================================================================
// JSDoc Type Definitions für State-Strukturen.
// Diese Datei enthält KEINEN Laufzeitcode — nur Typen für IDE-Autocomplete.
// VS Code / TypeScript-Server liest typedefs hier und gibt sie überall im
// Projekt als Autovervollständigung weiter.
// ============================================================================

/**
 * @typedef {'pv'|'bess'|'wind'|'hydro'|null} ProjectType
 */

/**
 * @typedef {'aktiv'|'pausiert'|'abgeschlossen'|'bearbeitung'} ProjectStatus
 */

/**
 * @typedef {Object} Timeline
 * @property {string} [planStart]
 * @property {string} [planEnd]
 * @property {string} [permitStart]
 * @property {string} [permitEnd]
 * @property {string} [buildStart]
 * @property {string} [buildEnd]
 * @property {string} [commDate]
 * @property {string} [gridDate]
 * @property {string} [acceptanceDate]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} CustomParam
 * @property {string} id
 * @property {string} key
 * @property {string} label
 * @property {number} value
 * @property {string} unit
 */

/**
 * @typedef {Object} DocChecklistItem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {'ausstehend'|'beantragt'|'geprueft'|'freigegeben'} status
 * @property {string} [notes]
 * @property {boolean} [custom]
 */

/**
 * @typedef {Object} BessAbschnitt
 * @property {string} key
 * @property {string} label
 * @property {'geplant'|'in_bearbeitung'|'fertig'} status
 * @property {string} notes
 */

/**
 * @typedef {Object} Anlage
 * @property {string} id
 * @property {string} name
 * @property {string} [status]
 * @property {string} [notes]
 * @property {string} [mvSkidId]
 */

/**
 * @typedef {Object} MvSkid
 * @property {string} id
 * @property {string} name
 * @property {string} [status]
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} [address]
 * @property {string} [client]
 * @property {ProjectType} [type]
 * @property {string} [start] — YYYY-MM-DD
 * @property {string} [end]
 * @property {ProjectStatus} [status]
 * @property {Object<string,number>} [params]
 * @property {Timeline} [timeline]
 * @property {CustomParam[]} [customParams]
 * @property {DocChecklistItem[]} [docChecklist]
 * @property {BessAbschnitt[]} [bessAbschnitte]
 * @property {Anlage[]} [anlagen]
 * @property {MvSkid[]} [mvSkids]
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {'aufgabe'|'mangel'} type
 * @property {'hoch'|'mittel'|'niedrig'} priority
 * @property {'offen'|'bearbeitung'|'erledigt'} status
 * @property {string} [trade]
 * @property {string} [location]
 * @property {string} [assignee]
 * @property {string} [due] — YYYY-MM-DD
 * @property {string} [photo]
 * @property {string} projectId
 * @property {string} [created]
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} [company]
 * @property {string} [name]
 * @property {string} [trade]
 * @property {string} [contact]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [address]
 * @property {string} [notes]
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} Erkenntnis
 * @property {string} id
 * @property {'Mangel'|'Info'|'Anweisung'} typ
 * @property {string} beschreibung
 * @property {string} [foto]
 */

/**
 * @typedef {Object} DiaryEntry
 * @property {string} id
 * @property {'eintrag'|'begehung'} type
 * @property {string} date — YYYY-MM-DD
 * @property {string} [weather]
 * @property {string} [temp]
 * @property {string} [workforce]
 * @property {string} [work]
 * @property {string} [notes]
 * @property {string} [grund]
 * @property {Erkenntnis[]} [erkenntnisse]
 * @property {string} projectId
 */

/**
 * @typedef {Object} ScheduleDep
 * @property {string} predId
 * @property {'EA'|'AA'|'EE'|'AE'} type
 * @property {number} lag — Tage; positiv=Puffer, negativ=Überlappung
 */

/**
 * @typedef {Object} Reminder
 * @property {string} date — YYYY-MM-DD
 * @property {string} [message]
 * @property {boolean} [triggered]
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {Object} ScheduleTask
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} [start]
 * @property {string} [end]
 * @property {number} [duration]
 * @property {number} [level]
 * @property {string} [assignee]
 * @property {number} [progress]
 * @property {ScheduleDep[]} [deps]
 * @property {Reminder|null} [reminder] — Legacy
 * @property {Reminder[]} [reminders]
 * @property {ChecklistItem[]} [checklist]
 */

/**
 * @typedef {Object} Pruefung
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} type
 * @property {string} [gewerk]
 * @property {string} [plannedDate]
 * @property {string} [actualDate]
 * @property {'geplant'|'durchgefuehrt'|'bestanden'|'nicht_bestanden'} status
 * @property {string} [ergebnis]
 * @property {string} [notes]
 * @property {string} [created]
 */

/**
 * @typedef {Object} KalenderEntry
 * @property {string} id
 * @property {string} title
 * @property {string} date — YYYY-MM-DD
 * @property {'termin'|'frist'|'erinnerung'|'info'|'aufgabe'|'mangel'} type
 * @property {string} [description]
 * @property {'manual'|'task'|'bauzeitplan'} [source]
 * @property {string|null} [projectId]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {boolean} [readonly]
 */

/**
 * @typedef {Object} Nebenbestimmung
 * @property {string} id
 * @property {string} text
 * @property {string} [frist]
 * @property {string} [zustaendiger]
 * @property {'offen'|'bearbeitung'|'erfuellt'} status
 */

/**
 * @typedef {Object} Genehmigung
 * @property {string} id
 * @property {'genehmigung'|'gutachten'} kategorie
 * @property {string} [bereich]
 * @property {string} [typ]
 * @property {string} [bezeichnung]
 * @property {string} [bescheid_nr]
 * @property {string} [behoerde]
 * @property {string} [datum_bescheid]
 * @property {string} [datum_bestandskraft]
 * @property {'ausstehend'|'beantragt'|'erteilt'|'bestandskraeftig'} status
 * @property {string} [notizen]
 * @property {Nebenbestimmung[]} [nebenbestimmungen]
 * @property {string|null} projektId
 */

/**
 * @typedef {Object} GenehmVorpruefung
 * @property {string} id
 * @property {string} kategorie
 * @property {string} label
 * @property {'offen'|'beantragt'|'vorhanden'|'nicht_relevant'} status
 * @property {string} [notizen]
 * @property {boolean} [custom]
 * @property {string|null} projektId
 */

/**
 * @typedef {Object} Querung
 * @property {string} id
 * @property {string} typ
 * @property {string} bezeichnung
 * @property {string} [lage]
 * @property {string} [behoerde]
 * @property {string} [tiefe_max]
 * @property {string} [genehmigung_nr]
 * @property {string} [datum_genehmigung]
 * @property {string} status
 * @property {string} [notizen]
 * @property {Nebenbestimmung[]} [nebenbestimmungen]
 * @property {string|null} projektId
 */

/**
 * @typedef {Object} Nutzungsvertrag
 * @property {string} id
 * @property {string} bezeichnung
 * @property {string} [eigentuemer]
 * @property {string} [flaeche_ha]
 * @property {string[]} bereich
 * @property {string} [typ]
 * @property {string} [laufzeit_bis]
 * @property {string} [kuendigung_monate]
 * @property {string} [tiefe_max]
 * @property {'ausstehend'|'aktiv'|'abgelaufen'|'gekuendigt'} status
 * @property {string} [notizen]
 * @property {string|null} projektId
 */

/**
 * @typedef {Object} PriceHistoryEntry
 * @property {string} id
 * @property {number} price
 * @property {string} [date]
 * @property {string} [source]
 */

/**
 * @typedef {Object} PriceItem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} unit
 * @property {PriceHistoryEntry[]} [history]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} Calculation
 * @property {string} id
 * @property {string} name
 * @property {string} projectId
 * @property {number} quantile — 0..1
 * @property {Object[]} [categories]
 * @property {string} [created]
 */

/**
 * @typedef {Object} Estimate
 * @property {string} id
 * @property {string} name
 * @property {ProjectType} type
 * @property {string} projectId
 * @property {Object<string,number>} [paramOverrides]
 * @property {Object<string,Object>} [lineOverrides]
 * @property {string} [created]
 */

/**
 * @typedef {Object} ProjektTrackerEntry
 * @property {string} id
 * @property {string} nr
 * @property {string} projektName
 * @property {'gruen'|'gelb'|'rot'} bewertung
 * @property {string} [risiken]
 * @property {string} [massnahme]
 */

/**
 * @typedef {Object} Settings
 * @property {string} theme
 * @property {boolean} [headerMinimized]
 * @property {boolean} [vpHidden]
 * @property {string} [trackerEmail]
 * @property {string} [trackerEmailSubject]
 * @property {string} [trackerEmailBody]
 * @property {string} [trackerSaveDirName]
 * @property {string} [backupDirName]
 * @property {number} [backupInterval]
 * @property {string|null} [lastBackup]
 * @property {Object<string,string>} [kalTypeColors]
 */

/**
 * @typedef {Object} AppState
 * @property {string|null} currentProject
 * @property {Project[]} projects
 * @property {Contact[]} contacts
 * @property {Task[]} tasks
 * @property {DiaryEntry[]} diary
 * @property {Object[]} protocols
 * @property {PriceItem[]} priceItems
 * @property {Calculation[]} calculations
 * @property {Estimate[]} estimates
 * @property {Object[]} schaetzungVorlagen
 * @property {Object[]} schaetzungGruppenVorlagen
 * @property {Pruefung[]} pruefungen
 * @property {ScheduleTask[]} schedule
 * @property {KalenderEntry[]} kalenderEntries
 * @property {Settings} settings
 * @property {string} hilfeNotes
 * @property {Genehmigung[]} genehmigungen
 * @property {Querung[]} querungen
 * @property {Nutzungsvertrag[]} nutzungsvertraege
 * @property {GenehmVorpruefung[]} genehmVorpruefung
 * @property {ProjektTrackerEntry[]} projektTracker
 * @property {Object|null} estTemplates
 * @property {Object[]} bfbReports
 * @property {WikiArticle[]} wikiArticles
 */

/**
 * @typedef {Object} WikiArticle
 * @property {string} id
 * @property {string} title
 * @property {string} content   - Markdown-Inhalt; Bilder als ![alt](wiki:imageId) referenziert
 * @property {string[]} tags    - freie Tags zur Kategorisierung
 * @property {number} updatedAt - Timestamp
 */

// Hinweis: JS-Code, der Module-übergreifend Typen nutzen will, kann mit
//   /** @type {Project} */
//   const p = state.projects[0];
// arbeiten und bekommt sofort IntelliSense für alle Felder.
