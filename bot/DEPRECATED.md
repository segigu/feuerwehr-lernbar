# ⚠️ Telegram-Bot deaktiviert

Dieser Telegram-Bot wird **nicht mehr betrieben**.

## Grund

Telegram-Nachrichten laufen über Server außerhalb der EU, für die sich
praktisch kein Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO
abschließen lässt. Das war datenschutzrechtlich das schwächste Glied der
Architektur.

## Was stattdessen genutzt wird

Die gesamte Funktionalität — Lerninhalte, Quiz, KI-Ausbilder (Frage/Antwort)
und Sprachfragen — läuft eigenständig in der **PWA** unter `webapp/`,
ausgeliefert über GitHub Pages. Es wird kein Telegram benötigt.

## Status des Codes

Der Bot-Code (`src/bot.ts`, grammY) bleibt zu Referenzzwecken im Repository,
wird aber nicht deployt und nicht gestartet. Der laufende Bot-Prozess muss
**manuell auf dem Host gestoppt** werden (er läuft außerhalb dieses Repos).
