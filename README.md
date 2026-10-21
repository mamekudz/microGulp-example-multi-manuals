# Mehrere Handbücher mit µGulp™

Dieses Beispiel erzeugt aus einer gepflegten Word-Vorlage Handbücher für verschiedene Clients, Plattformen und Versionen. Gulp und µGulp™ bedienen denselben Renderer. Für PDF aktualisiert eine mitgelieferte LibreOffice-Basic-Bibliothek die Felder und Verzeichnisse.

## Start

Voraussetzungen: Node.js ab 22; für PDF eine lokale LibreOffice-Installation. Getestet mit Windows, Node 22.19.0 und LibreOffice 26.8.0.3. Die MacOS-Variante bezeichnet den Dokumentinhalt, keinen bereits getesteten Export auf macOS.

```sh
npm ci
npm test
npm run manuals
npm run manuals -- --variants=company-b-macos-1_5 --pdf
npx gulp CREATE_MANUALS
```

`manuals.json` definiert Client, Anzeigename, Plattform, Version und Vorlage je Variante. Ohne `--pdf` entscheidet `features.pdf`, standardmäßig false. µGulp™ bietet eine Checkboxauswahl und einen PDF-Schalter im einzigen Taskformular. Die CLI benötigt keine IDE. Die lokale API 0.7.0 liegt im vendor-Verzeichnis, solange die Veröffentlichung noch aussteht.

Jeder Lauf schreibt ausschließlich in einen neuen Ordner `dist/<run-id>/`. Dort stehen DOCX, optional PDF und `manifest.json` mit Variante, Vorlagenhash, Ergebnis und Dokumenthash. Bestehende Läufe bleiben erhalten. Ein Teilfehler lässt die bereits entstandenen Dateien für die Diagnose liegen und markiert den Lauf als fehlgeschlagen.

## Word-Vorlage

Die einzige gepflegte Vorlage ist `../µGulp_LibreOffice_Word_Demo_Manual.src.docx`. Der lokale Build liest diese Datei direkt über `../µGulp_LibreOffice_Word_Demo_Manual.src.docx`; es gibt keine zweite DOCX-Pflegequelle. Für ein eigenständig heruntergeladenes Beispiel muss die bereitgestellte Vorlage als Nachbardatei des Projektordners liegen. Die Verzeichnisstruktur ist `µGulp_LibreOffice_Word_Demo_Manual.src.docx` neben `multi-manuals/`.

```text
+++CLIENT_STR+++
+++VERSION+++
+++IF CLIENT=='MyClientCompanyB'+++
+++IF PLATFORM=='MacOS'+++
+++END-IF+++
+++END-IF+++
+++IF VERSION_AT_LEAST('1.5.0')+++
+++END-IF+++
```

Die Pluszeichen sind die tatsächlichen `+++`-Begrenzer. Bedingungen brauchen `IF`; `EXEC` führt JavaScript aus und blendet keinen Abschnitt aus. Versionsnummern werden als drei ganzzahlige Bestandteile verglichen. `1.10.0` liegt damit nach `1.5.0`. Der Appendixzähler gehört zum Datenobjekt eines einzelnen Dokuments.

Vorlagen enthalten ausführbare Ausdrücke und müssen vertrauenswürdig sein. Neue Sprachfassungen werden redaktionell erstellt; weder docx-templates noch µGulp™ übersetzt das Handbuch automatisch. Das Beispiel besitzt bislang eine deutsch benannte Vorlage mit den vorhandenen englischen Demoüberschriften und Blindtexten.

## LibreOffice-Skript

`libreoffice/RecipeManuals.xba` ist Bestandteil des Repositorys. `src/Office.mjs` initialisiert für jeden Export ein eigenes `.office-*`-Profil unter dem neuen Ausgabeordner, kopiert die Bibliothek hinein und registriert sie in `user/basic/script.xlc`. Die normale LibreOffice-Konfiguration und laufende Benutzerinstanzen werden nicht verändert.

Das Makro öffnet die generierte DOCX verborgen, verbietet eingebettete Dokumentmakros, aktualisiert Textfelder und Verzeichnisse, führt `UpdateAll` aus, speichert die DOCX und exportiert mit `writer_pdf_Export`. Erst danach schreibt es `result.txt` mit `ok`. Der Aufrufer prüft Prozessende, Abschlussdatei und PDF-Kennung; Exitcode 0 allein gilt nicht als Erfolg. Fehler werden weitergereicht. Nach 120 Sekunden wird ausschließlich der für diesen Export gestartete Prozess beziehungsweise sein Prozessbaum beendet. Profile bleiben zur Diagnose erhalten.

Abweichende Installation: Umgebungsvariable `LIBREOFFICE_PATH` auf die ausführbare Datei setzen. Unter Windows wird `soffice.com`, unter Linux `/usr/bin/soffice` und unter macOS der Programmpfad innerhalb von LibreOffice.app verwendet. Diese beiden Unix-Pfade sind vorbereitet, noch nicht praktisch geprüft. Kopfzeilen, Schriften und Umbrüche hängen vom Office-Renderer ab. Ein reines `--convert-to` ersetzt nicht den hier geprüften Feldaktualisierungsschritt.

## Grenzen und weitere Ausbaustufen

Der aktuelle Vertrag umfasst vollständige Handbücher. Dynamische Bilder, Datenbankabfragen sowie eigene Tastatur- und Icontabellen sind bewusst spätere Ausbaustufen. Der eigene Renderer übernimmt keine Firmendokumente, Produktdaten oder Netzlaufwerkzugriffe aus einem anderen Projekt.

Die Tests prüfen echte DOCX-Ergebnisse, Client-/Plattformbedingungen, Versionsgrenzen, getrennte Läufe, ungültige Konfiguration und einen fehlenden Office-Prozess. Die Windows-PDF-Integration wurde zusätzlich mit beiden Standardvarianten durchgeführt. IDE-Bedienung und Exporte auf Linux/macOS bleiben zur Abnahme offen. Der Gulp-Entwicklungsabhängigkeitsbaum meldet derzeit eine nicht im Beispiel behobene braces-Schwachstelle; kein automatisches Downgrade auf Gulp 3 verwenden. Einzelheiten stehen im Prüfbericht des Artikels.

Artikeladresse nach Freigabe: https://microgulp.dev/blogs/multi-manuals. Das öffentliche [Beispielrepository](https://github.com/mamekudz/microGulp-example-multi-manuals) enthält bis zum nächsten freigegebenen Commit noch den bisherigen Stand.

Quellen: [docx-templates auf npm](https://www.npmjs.com/package/docx-templates), [Word documents, The Relay Way](https://guigrpa.github.io/2017/01/01/word-docs-the-relay-way/), [LibreOffice-Startparameter](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).

Lizenz für den neuen Beispielcode: [MIT](LICENSE). Die übernommene Dummy-Vorlage ist als vom Autor bereitgestellte Quelle dokumentiert.

## Eigene Versionshistorie

`RELEASES.json` ist die einzige Quelle der Beispielversion (neuester Eintrag zuerst). Englische Releasehinweise tragen `<context="release info"/>`; die Wörterbücher unter `i18x/gulp` enthalten die Sprachfassungen. Ein Eintrag bedeutet noch keine Veröffentlichungsfreigabe.

`npm run release:check` prüft Versionen; `npm run release:sync` gleicht package.json und die Wurzel der Lockdatei ab. `npm run release:history -- --language=de-DE` zeigt die Historie. Die Prüfung läuft auch vor npm test.

Für eine Änderung oben einen neuen Releaseeintrag ergänzen, Sprachfassungen nachziehen, synchronisieren, Tests ausführen und danach den geprüften Commit in article.json festhalten. Frühere Einträge erhalten. Ein Versionsbump veröffentlicht weder Paket noch Repository.

## Projekttitel und Logo in µGulp

Diesen Beispielordner als eigenen Workspace öffnen. `microgulp.config.json` zeigt **µGulp Example: Multi Manuals** oberhalb der Taskliste. `project.title` und `project.description` lassen sich dort anpassen; `project.logo` verweist auf die mitgelieferte Datei `assets/microgulp-logo.png`. Der Pfad bleibt relativ zum Beispiel-Workspace. Die Projektkennung ist keine Gulpfile-Eigenschaft und verändert keine technischen Tasknamen. Bei mehreren Gulpfiles in demselben Workspace gilt derselbe Projekttitel.

## Kurztasten im Dashboard

- `CREATE_MANUALS`: Windows/Linux `Ctrl+Shift+F4`, macOS `Cmd+Shift+F4`.

Zuerst das µGulp-Dashboard fokussieren. Die Kurztaste startet denselben Task wie ein Klick, einschließlich eines vorhandenen Taskformulars; sie wählt keine Formularwerte vor und sendet das Formular nicht ab. In Texteingabefeldern werden keine Task-Kurztasten ausgelöst. Die Belegungen gelten im Dashboard, nicht IDE-weit. Falls IDE oder Betriebssystem eine Kombination abfangen, lässt sich `µKeyBinding` im Gulpfile ändern. Manche Tastaturen benötigen zusätzlich Fn für Funktionstasten.

```javascript
CREATE_MANUALS.µKeyBinding = { key: 'ctrl+shift+F4', mac: 'cmd+shift+F4' };
```

<!-- blog-publication:start -->
Artikel: [Deutsch](https://microgulp.dev/de/blog/multi-manuals/)

Weitere Beispiele: [microGulp-Examples](https://github.com/mamekudz/microGulp-Examples).
<!-- blog-publication:end -->
