# Руководство по созданию лекций для MTA Prüfungstrainer

Этот документ описывает правила написания учебного контента для уроков (Unterricht).
Основан на опыте создания первого урока `rettung-leitern-knoten.ts` — используй его как эталон.

---

## 1. Структура данных

Каждый урок — TypeScript-файл, экспортирующий объект `Lesson`.

```typescript
// webapp/src/data/lessons/types.ts

type Block =
  | { type: 'text'; de: string; ru: string }
  | { type: 'term'; de: string; ru: string }
  | { type: 'key'; de: string; ru: string }
  | { type: 'warn'; de: string; ru: string }
  | { type: 'list'; items: string[]; itemsRu?: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; bilingualCols?: number[] }
  | { type: 'image'; src: string; alt?: string; altRu?: string; caption?: string; captionRu?: string };

interface Section {
  id: string;       // kebab-case, уникальный в рамках урока
  title: string;    // заголовок на немецком
  titleRu: string;  // заголовок на русском
  blocks: Block[];
}

interface LessonQuestion {
  id: number;
  question: string;
  options: { a: string; b: string; c: string };
  image?: string | null;
  correct: 'a' | 'b' | 'c';
  topic: string;
  sectionId?: string;       // ID секции лекции, к которой относится вопрос
  explanation?: string;      // объяснение после ответа (DE)
  explanationRu?: string;    // объяснение после ответа (RU)
}

interface Lesson {
  id: string;         // совпадает с именем файла (без .ts)
  topic: string;      // тема из каталога вопросов
  title: string;      // заголовок на немецком
  titleRu: string;    // заголовок на русском
  chapters: string[]; // номера глав Basismodul, напр. ['2.1', '2.2']
  sections: Section[];
  questions: LessonQuestion[];
  ready: boolean;     // true когда контент готов
}
```

## 2. Типы блоков — когда какой использовать

### `text` — основной тип (80-90% всех блоков)

Повествовательный текст. Абзац лекции. Связный, логичный, объясняющий.

**Хорошо:**
```
de: 'Die Steckleiter ist die am häufigsten verwendete tragbare Leiter bei der Feuerwehr.
Ihr Prinzip ist einfach: Sie besteht aus einzelnen Leiterteilen, die ineinander gesteckt
werden — daher der Name. Diese modulare Bauweise hat einen großen Vorteil: Man kann die
Leiter je nach Bedarf in unterschiedlichen Längen aufbauen.'
```

**Плохо:**
```
de: 'Steckleiter — einzelne Leiterteile werden zusammengesteckt.'
```

Правила:
- Минимум 2-3 предложения на блок. Одно предложение — слишком мало.
- Связывай мысли в один блок. Не делай отдельный блок для каждого предложения.
- Объясняй ЗАЧЕМ — не просто "угол 65-75°", а почему именно, что будет если больше/меньше.
- HTML-тег `<strong>` для выделения терминов и ключевых понятий внутри текста.

### `term` — термин с переводом (только для Vokabeln)

Используется **исключительно** для карточек-флешкарт (Vokabeln). Блоки `term` автоматически
извлекаются функцией `extractVocab()` и становятся карточками DE↔RU.

```
{ type: 'term', de: 'Steckleiter', ru: 'Штекерная лестница' }
```

Правила:
- Термин, а не предложение. Короткое определение — 1-3 слова.
- Не дублируй объяснение, которое уже есть в `text`-блоке.
- Ставь `term` ПОСЛЕ текстового блока, где термин объясняется.
- На рендере отображается как: **Steckleiter** — Штекерная лестница

### `key` — важное правило или факт (5-10% блоков)

Для числовых нормативов, обязательных правил, критических фактов, которые нужно запомнить.

```
{ type: 'key',
  de: 'Höchstens 4 Leiterteile dürfen zusammengesteckt werden...',
  ru: 'Максимум 4 секции разрешено соединять...' }
```

Рендерится с зелёным фоном и меткой "✔ Merke:".

Правила:
- Только действительно важные вещи, которые будут на экзамене.
- Не больше 1-2 `key`-блоков на секцию.
- Включай конкретные числа (метры, углы, количество людей).

### `warn` — предупреждение, опасность (1-2 на секцию)

Для правил ТБ, запретов, опасных ситуаций.

```
{ type: 'warn',
  de: 'Mindestabstand zu Freileitungen: 1 m Niederspannung, 5 m Hochspannung...',
  ru: 'Минимальная дистанция до ЛЭП: 1 м низкое напряжение, 5 м высокое...' }
```

Рендерится с жёлтым/оранжевым фоном и меткой "⚠ Achtung!".

Правила:
- Только реальные опасности для жизни/здоровья.
- Не злоупотребляй — если всё "achtung", ничего не achtung.

## 3. Стиль написания контента

### Повествовательный учебный стиль

Пиши как хороший учебник для пожарных, а не как справочник или конспект.

| НЕТ (конспект)                          | ДА (учебник)                                                  |
| --------------------------------------- | ------------------------------------------------------------- |
| Anstellwinkel: 65°-75°                  | Eine tragbare Leiter muss in einem Winkel von 65° bis 75° aufgestellt werden. Ist der Winkel zu steil, kann die Leiter nach hinten kippen... |
| FwDV 10 regelt tragbare Leitern         | Die FwDV 10 „Tragbare Leitern" ist eine verbindliche Dienstvorschrift — das bedeutet, ihre Vorgaben müssen bei jedem Einsatz eingehalten werden. |
| Steckleiter: A-Teil hat Stützstangen    | Es gibt zwei Arten von Steckleiterteilen: A-Teile und B-Teile. Der Unterschied ist leicht zu merken: A-Teile haben unten Stützstangen, B-Teile haben keine. |

### Правила для текста

1. **Объясняй ЗАЧЕМ** — не просто факт, а причину. "Leiterkopf muss 1m hinausragen — damit die Person etwas zum Festhalten hat."
2. **Раскрывай стандарты** — FwDV 10: что это, что регулирует, почему обязательно. Не просто "laut FwDV 10".
3. **Практические примеры** — как это работает на реальном выезде. "In der Praxis funktioniert das so:..."
4. **Логическая последовательность** — от простого к сложному, от общего к частному.
5. **Связность** — переходы между блоками и секциями. Не набор отдельных фактов.
6. **Простой немецкий** — уровень B1-B2. Предложения не длиннее 25 слов. Без канцелярита.

### Правила для русского перевода

- **Осмысленный перевод**, не подстрочник. Русский текст должен читаться естественно.
- Если немецкий термин лучше оставить (FwDV, Steckleiter) — оставь и дай пояснение.
- Для специфических терминов ищи устоявшийся русский эквивалент (Mastwurf → выбленочный узел).
- Если точного эквивалента нет — транслитерируй + поясни в скобках.

## 4. Структура урока

### Количественные ориентиры

| Элемент                  | Рекомендация          |
| ------------------------ | --------------------- |
| Секции                   | 5-8                   |
| Блоков на секцию         | 4-7                   |
| `text` блоков на секцию  | 3-5                   |
| `key` блоков на секцию   | 0-2                   |
| `warn` блоков на секцию  | 0-1                   |
| `term` блоков на секцию  | 0-3                   |
| Вопросов (кастомных)     | 10-20                 |
| Вопросов (из каталога)   | Все по теме           |

### Порядок блоков в секции

1. Вводный `text` — о чём эта секция, зачем это знать
2. Основные `text` — содержательная часть с объяснениями
3. `term` — если есть термины для флешкарт (после объяснения в тексте)
4. `key` — ключевые факты/числа для запоминания
5. `warn` — предупреждения об опасности (если есть)

Это не жёсткий порядок — можно чередовать text/term/key по смыслу.

### Вопросы

- **Кастомные вопросы** (id 1-99): Написанные специально для урока. Покрывают ключевые факты из лекции.
- **Вопросы из каталога** (id 101+): Взяты из официального каталога экзаменационных вопросов.
  Ищи по `topic` в файле `webapp/src/data/questions.ts`.
- Поле `topic` у кастомных вопросов — произвольная категория для отображения.
- Поле `topic` у вопросов из каталога — всегда `'Fragenkatalog'`.

### Привязка вопросов к секциям (`sectionId`)

Каждый вопрос **обязательно** должен иметь поле `sectionId` — ID секции лекции,
к которой относится вопрос. После ответа ссылка "Zur Lektion →" ведёт именно в эту секцию.

```typescript
{
  id: 1,
  question: 'Welche Leiter wird aus einzelnen Teilen zusammengesteckt?',
  options: { a: 'Schiebleiter', b: 'Steckleiter', c: 'Klappleiter' },
  correct: 'b',
  topic: 'Tragbare Leitern',
  sectionId: 'steckleiter',  // ← ID секции из sections[]
  explanation: '...',
  explanationRu: '...',
}
```

Правила:

1. `sectionId` должен совпадать с `id` одной из секций урока (`sections[].id`).
2. Выбирай секцию, в которой **раскрывается правильный ответ** на вопрос.
3. Если вопрос охватывает несколько секций — выбирай ту, где ответ наиболее явно описан.

### Объяснения к вопросам (`explanation` / `explanationRu`)

Каждый вопрос **обязательно** должен иметь поля `explanation` и `explanationRu`.
После ответа на вопрос в квизе пользователю показывается инлайн-блок с объяснением.

```typescript
{
  id: 1,
  question: 'Welche Leiter wird aus einzelnen Teilen zusammengesteckt?',
  options: { a: 'Schiebleiter', b: 'Steckleiter', c: 'Klappleiter' },
  correct: 'b',
  topic: 'Tragbare Leitern',
  explanation: 'Die Steckleiter besteht aus einzelnen Leiterteilen (A- und B-Teile), die ineinander gesteckt werden — daher der Name.',
  explanationRu: 'Штекерная лестница состоит из отдельных секций (A и B), которые вставляются друг в друга — отсюда и название.',
}
```

Правила написания объяснений:

1. **1-3 предложения** — коротко, но содержательно. Не пересказ всей лекции.
2. **Объясняй ПОЧЕМУ правильный ответ правильный** — не просто "правильный ответ B",
   а суть: почему именно так, чем отличается от неправильных вариантов.
3. **Бери из лекции** — текст объяснения должен быть основан на содержании секций урока.
4. **Упоминай ключевые числа** — если вопрос про числовой параметр (высота, угол, количество),
   повтори число в объяснении.
5. **Русский перевод** — осмысленный, не подстрочник. Как и для лекции.
6. **Контраст с неправильными ответами** — если уместно, объясни почему другие варианты
   не подходят ("Die Schiebleiter wird dagegen über einen Seilzug ausgezogen").

## 5. Источники контента

### PDF учебник
Файл: `doc/MTA Basismodul Teilnehmerunterlagen ohne Funk V1.1.pdf`

Это основной источник фактов и структуры. Извлекай с помощью `pdftotext`:
```bash
pdftotext "doc/MTA Basismodul Teilnehmerunterlagen ohne Funk V1.1.pdf" - | head -1000
```
Или читай конкретные страницы через Read tool (указывая `pages`).

PDF содержит конспективные заметки — их нужно РАЗВЕРНУТЬ в полноценный текст.

### Веб-поиск для обогащения

Ищи дополнительную информацию через WebSearch:
- Официальные нормативы: FwDV 3, FwDV 7, FwDV 10, DIN-стандарты
- Практические описания: "Steckleiter Aufbau Feuerwehr", "Schiebleiter Handhabung"
- Учебные материалы пожарных школ: "Feuerwehr Grundlehrgang [тема]"
- Безопасность: конкретные правила, числовые нормативы, DIN EN стандарты

### Каталог вопросов
Файл: `webapp/src/data/questions.ts`

Ищи вопросы по теме урока (поле `topic`). Все подходящие вопросы включай в массив `questions`.

## 6. Процесс создания урока

### Шаг 1: Подготовка
1. Прочитай соответствующий раздел PDF
2. Найди вопросы по теме в каталоге (`questions.ts`)
3. Проведи веб-поиск для обогащения (FwDV, нормативы, практика)

### Шаг 2: Планирование секций
1. Определи 5-8 секций от общего к частному
2. Для каждой секции — заголовок DE и RU, `id` в kebab-case

### Шаг 3: Написание контента
1. Пиши секцию за секцией
2. Начинай с немецкого текста, затем русский перевод
3. Встраивай термины в повествование, не выделяй отдельными блоками
4. `key`/`warn` — только для критически важного

### Шаг 4: Вопросы
1. Перенеси подходящие вопросы из каталога (id 101+)
2. Напиши 10-20 кастомных вопросов (id 1-99) по ключевым фактам лекции
3. Каждый вопрос — 3 варианта ответа (a, b, c)

### Шаг 5: Проверка сборки

```bash
cd webapp && npm run build
```

### Шаг 6: Валидация контента vs вопросов

После написания лекции и вопросов — обязательно проверь, что текст лекции покрывает все ответы.

Для каждого вопроса:

1. Найди секцию по `sectionId`
2. Убедись, что **правильный ответ явно содержится** в тексте этой секции
3. Если ответа нет или он описан другими словами — дописать в лекцию

Типичные проблемы:

- Вопрос спрашивает про конкретное число (длина, угол), а в лекции этого числа нет
- Вопрос использует термин, который в лекции не упоминается
- Правильный ответ следует из контекста, но нигде не сказан прямо

Для автоматизации можно запустить агента, который пройдёт каждый вопрос и сверит
правильный ответ с текстом соответствующей секции.

## 7. Список уроков

Уроки упорядочены по номерам глав Basismodul (Kap).

| # | Файл | Kap | Тема | Статус |
|---|------|-----|------|--------|
| 1 | `rechtsgrundlagen.ts` | 2.1, 2.2 | Rechtsgrundlagen und Organisation | готов |
| 2 | `brennen-loeschen.ts` | 3 | Brennen und Löschen | готов |
| 3 | `fahrzeugkunde.ts` | 4.1, 13 | Fahrzeugkunde und Fahrzeugtechnik | готов |
| 4 | `persoenliche-ausruestung.ts` | 5.1, 5.2, 5.3 | Schutzausrüstung und Löschgeräte | готов |
| 5 | `schlaeuche-armaturen.ts` | 5.5 | Schläuche und Armaturen | готов |
| 6 | `hilfeleistungsgeraete.ts` | 5.7, 5.8 | Geräte für Hilfeleistung | готов |
| 7 | `rettungsgeraete.ts` | 5.9, 5.10 | Rettungsgeräte, Leitern und Knoten | **ГОТОВ** (эталон) |
| 8 | `belastungen.ts` | 6.2 | Physische und psychische Belastungen | готов |
| 9 | `verhalten-einsatz.ts` | 7.1 | Verhalten im Einsatz | готов |
| 10 | `hygiene.ts` | 7.2 | Hygiene im Einsatz | готов |
| 11 | `verhalten-gefahr.ts` | 8 | Verhalten bei Gefahr | готов |
| 12 | `loescheinsatz.ts` | 9.1, 9.3, 9.5 | Löscheinsatz (FwDV 3) | готов |
| 13 | `absturzsicherung.ts` | 10.1 | Sichern gegen Absturz | готов |
| 14 | `hilfeleistungseinsatz.ts` | 11.1 | Einheiten im Hilfeleistungseinsatz | готов |
| 15 | `abc-gefahrstoffe.ts` | 12.1, 12.2 | ABC-Gefahrstoffe | готов |
| 16 | `erste-hilfe.ts` | — | Erste Hilfe (Zusatzthema) | готов |
| 17 | `sprechfunk.ts` | E | Sprechfunk (Ergänzungsmodul) | готов |

## 8. Эталонный урок

Файл: `webapp/src/data/lessons/rettungsgeraete.ts`

Этот урок — образец для всех остальных. Обрати внимание на:
- Повествовательный стиль текстовых блоков (3-5 предложений на блок)
- Объяснения причин ("Der Grund:...", "Das bedeutet:...")
- Практические сценарии ("In der Praxis funktioniert das so:...")
- Раскрытие стандартов (FwDV 10 — что это и зачем)
- HTML `<strong>` для терминов внутри текста
- Соотношение типов блоков: ~80% text, ~10% key, ~5% warn, ~5% term

## 9. Промпт-шаблон для генерации урока

```
Перепиши контент урока [ФАЙЛ] на тему [ТЕМА].

Источники:
1. PDF: doc/MTA Basismodul Teilnehmerunterlagen ohne Funk V1.1.pdf — страницы [X-Y]
2. Каталог вопросов: webapp/src/data/questions.ts — topic "[ТЕМА]"
3. Веб-поиск: [FwDV номер], [DIN стандарты], [практика применения]

Требования:
- Следуй правилам из doc/LESSON_GUIDE.md
- Эталон: webapp/src/data/lessons/rettungsgeraete.ts
- Повествовательный стиль, не конспект
- Объясняй ЗАЧЕМ, раскрывай стандарты, давай практические примеры
- Русский перевод — осмысленный, не подстрочник
- 5-8 секций, 4-7 блоков на секцию
- 10-20 кастомных вопросов + все из каталога
- npm run build после написания
```

## 10. Частые ошибки (чего НЕ делать)

1. **Конспект вместо лекции** — "Steckleiter: 4 Teile, 8m" → нужен связный текст с объяснениями
2. **Слишком много `key`/`warn`** — если всё "важно", ничего не выделяется
3. **Отдельные `term`-блоки как заголовки** — термины встраивай в текст через `<strong>`
4. **Подстрочный перевод** — "Wird verwendet um..." → не "Используется чтобы...", а нормальный русский
5. **Ссылки на стандарты без объяснений** — "laut FwDV 10" → раскрой что это и зачем
6. **Один факт = один блок** — объединяй связанные мысли
7. **Слишком короткие блоки** — меньше 2 предложений = слишком мало
