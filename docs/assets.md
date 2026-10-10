# Сторонние ресурсы и лицензии

Реестр всех моделей, текстур, звуков, шрифтов и библиотек, взятых извне. **Каждый ресурс попадает в реестр до коммита в репозиторий.**

## Требования

### Лицензии

- Подходят: CC0, CC-BY (автор указывается в титрах на сайте), Royalty Free от маркетплейсов (CGTrader, Fab, Sketchfab Store), Mixamo.
- **Не берём**: CC-NC/ND без согласования, «Editorial use only», ассеты без явной лицензии.

### Модели

- Формат glTF/glb (или конвертируемый из FBX/OBJ/Blend).
- Стиль — полуреалистичный, PBR-материалы (см. §1 [SPEC.md](SPEC.md)).
- Избушка: ≤ 80 k треугольников после оптимизации, текстуры ≤ 2048²; желателен риг ног.
- Персонажи: ≤ 30 k треугольников каждый, риг совместим с Mixamo (для анимации бега).
- Перед добавлением в `public/` модель прогоняется через `bun run assets:optimize` (Draco/Meshopt, KTX2).

### Звук

- Бесшовные петли для эмбиента, 44.1/48 кГц, конвертируются в Opus (`.webm`) + AAC (`.m4a`).

## Кандидаты (требуют просмотра и выбора)

Найдены поиском 2026-10-10; полностью реалистичных бесплатных вариантов мало — возможно, придётся покупать или комбинировать.

### Избушка на курьих ножках

| Модель | Источник | Лицензия | Треуг. | Заметки |
| --- | --- | --- | --- | --- |
| The Hut On Fowl's Legs (Pelilasdis) | [Sketchfab](https://sketchfab.com/3d-models/the-hut-on-fowls-legs-665d4e5a05e94db7acc1a3f957110b7b) | CC-BY, бесплатно | 122.8 k | детальная, но стилизованная; нужна децимация |
| A hut on chicken legs (Yulia_vet.doc) | [Sketchfab](https://sketchfab.com/3d-models/a-hut-on-chicken-legs-b0117d56bb9b401f91442a1ce7f81329) | CC-BY, бесплатно | 33.4 k | стилизованная, лёгкая |
| The Hut on Chicken Legs Baba Yaga (angelush-p) | [CGTrader](https://www.cgtrader.com/3d-models/architectural/other/the-hut-on-chicken-legs-baba-yaga) | Royalty Free, платно | — | PBR, ближе к реализму |
| Rigged / animated huts | [CGTrader: поиск](https://www.cgtrader.com/3d-models/fairytale) | Royalty Free, платно | — | есть варианты с ригом ног и 4K PBR |

### Баба Яга, ступа, помело

| Модель | Источник | Лицензия | Треуг. | Заметки |
| --- | --- | --- | --- | --- |
| Baba Yaga witch (matousekfoto) | [Sketchfab](https://sketchfab.com/3d-models/baba-yaga-witch-b8be2d7b9ab944a28339bf65686e4138) → Fab | бесплатно, уточнить лицензию на Fab | 328.9 k | фотограмметрия, очень реалистично, есть помело; статичная фигура, без ступы; нужна сильная децимация |
| Baba Yaga (Francesca Ross) | [Sketchfab](https://sketchfab.com/3d-models/baba-yaga-d9a6e85d7e374dfbbd7bb7eee7d493dc) | CC-BY, бесплатно | 63.4 k | персонаж для короткометражки; без ступы |
| Baba Yaga Character (Inuciian) | [Sketchfab](https://sketchfab.com/3d-models/baba-yaga-character-2b0997bbd6964d7ea45d2943260dec23) | бесплатно, уточнить | — | посмотреть стиль |
| Baba Yaga's Pestle and Mortar (asrolta) | [Sketchfab](https://sketchfab.com/3d-models/baba-yagas-pestle-and-mortar-5bc7155bb897452b890ad646d71ea98d) | уточнить | 1.6 k | ступа с пестом — можно комбинировать с фигурой |
| Baba Yaga (rigged) | [CGTrader](https://www.cgtrader.com/3d-models/character/woman/baba-yaga-13400d5b-b580-492c-88dd-7fa1d45714bc) | Royalty Free, платно | — | с ригом |

Вероятный план: фигура старухи (сидячая поза или риг) + отдельная ступа с пестом + помело, собранные в Blender. Полёт — движение по сплайну и покачивание, сложная скелетная анимация не нужна.

### Василиса (бег)

| Модель | Источник | Лицензия | Заметки |
| --- | --- | --- | --- |
| Russian Girl (East) – Animated (tonyflanagan) | [Sketchfab](https://sketchfab.com/3d-models/russian-girl-east-animated-c182a54b7f7c4ae5b931033ba778965a) | бесплатно, уточнить | риг Mixamo, но современная одежда |
| Female Russian (inspired) Bard (vindr) | [Sketchfab](https://sketchfab.com/3d-models/female-russian-inspired-bard-21385e58266d48a28f69a6b58a68ab5e) | бесплатно, уточнить | одежда в русском стиле, проверить риг |
| Анимации бега и idle | [Mixamo](https://www.mixamo.com/) | бесплатно для проектов | ретаргет на выбранную модель |

Вероятный план: модель девушки в сарафане (найти или доработать одежду) → автоириг в Mixamo → анимации Running / Idle → экспорт glb.

## Реестр (используемые ресурсы)

| Ресурс | Где используется | Источник | Автор | Лицензия | Изменения |
| --- | --- | --- | --- | --- | --- |
| @dgreenheck/ez-tree | генерация деревьев | [GitHub](https://github.com/dgreenheck/ez-tree) | Daniel Greenheck | MIT | — |
| «Василиса Прекрасная» | текст | А. Н. Афанасьев, «Народные русские сказки», № 104 | — | общественное достояние | сокращения, см. [scenario.md](scenario.md) |

### Звук

Исходники скачивает и перекодирует `bun run audio:prepare` (`scripts/prepare-audio.ts`): нормализация громкости, Opus/WebM + MP3.

| Файл (`public/audio/`) | Что это | Источник | Автор | Лицензия |
| --- | --- | --- | --- | --- |
| `music-castle` | Мусоргский, «Картинки с выставки»: II. Il vecchio castello | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ii._il_vecchio_castello_-_andante.ogg) | М. П. Мусоргский; запись [Musopen](https://musopen.org) | общественное достояние |
| `music-catacombs` | VIII. Catacombae. Sepulcrum romanum | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_viii._catacombae._sepulcrum_romanum_-_largo.ogg) | Мусоргский; Musopen | общественное достояние |
| `music-cum-mortuis` | Cum mortuis in lingua mortua | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_cum_mortuis_in_lingua_mortua_-_andante_non_troppo,_con_lamento.ogg) | Мусоргский; Musopen | общественное достояние |
| `music-hut` | IX. Избушка на курьих ножках (Баба-Яга) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ix._la_cabane_sur_des_pattes_de_poule_-_allegro_con_brio,_feroce_-_andante_mosso_-_allegro_molto.ogg) | Мусоргский; Musopen | общественное достояние |
| `amb-forest-day` | Лесной эмбиент (петля) | [OpenGameArt: Forest Ambience](https://opengameart.org/content/forest-ambience) | TinyWorlds | CC0 |
| `amb-crickets` | Сверчки ночью (петля) | [OpenGameArt: Crickets Ambient Noise](https://opengameart.org/content/crickets-ambient-noise-loopable) | Wolfgang_ (Ted Kerr) | CC0 |
| `amb-wind` | Ветер (петля) | [OpenGameArt: wind whoosh loop](https://opengameart.org/content/wind-whoosh-loop) | SketchMan3 | CC0 |
| `sfx-owl` | Неясыть | [BigSoundBank: Tawny Owl #1](https://bigsoundbank.com/tawny-owl-1-s1763.html) | Joseph Sardin | CC0 |
| `sfx-tree-creak` | Скрип дерева | [OpenGameArt: Tree Creaking](https://opengameart.org/content/tree-creaking) | Department64, обработка AntumDeluge | CC0 |
| `sfx-crack-1…4`, `sfx-hut-creak-1…2` | Треск и скрип дерева (`wood_cracking_*`, `wood_squeak_*`) | [OpenGameArt: 100 CC0 metal and wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | rubberduck | CC0 |

### Шрифты

Подключаются из npm-пакетов Fontsource (файлы лежат в сборке, без внешних CDN), только кириллица и латиница.

| Шрифт | Где | Источник | Автор | Лицензия |
| --- | --- | --- | --- | --- |
| Ruslan Display | заголовки, буквицы | [@fontsource/ruslan-display](https://fontsource.org/fonts/ruslan-display) | Denis Masharov | OFL-1.1 |
| Old Standard TT | основной текст | [@fontsource/old-standard-tt](https://fontsource.org/fonts/old-standard-tt) | Alexey Kryukov | OFL-1.1 |

### Текстуры земли

Скачиваются скриптом `bun run textures:prepare` (`scripts/prepare-textures.ts`) в `public/textures/ground/` и перекодируются в WebP (нормали — 1K).

| Файл | Что это | Источник | Лицензия |
| --- | --- | --- | --- |
| `grass_*` | Sparse Grass (2K) | [Poly Haven](https://polyhaven.com/a/sparse_grass) | CC0 |
| `forest_*` | Forest Ground 01 (1K) | [Poly Haven](https://polyhaven.com/a/forrest_ground_01) | CC0 |
| `path_*` | Forest Ground 04 (2K) | [Poly Haven](https://polyhaven.com/a/forest_ground_04) | CC0 |

### Модели (подготовлены, в сцену ещё не встроены)

Исходники скачаны с Sketchfab в `.cache/models` (не в репозитории); `bun run models:prepare` (`scripts/prepare-models.ts`) упрощает геометрию, сжимает текстуры в WebP и геометрию Meshopt → `public/models/`.

| Файл | Модель | Автор | Лицензия | Изменения |
| --- | --- | --- | --- | --- |
| `hut.glb` | [A hut on chicken legs](https://sketchfab.com/3d-models/a-hut-on-chicken-legs-b0117d56bb9b401f91442a1ce7f81329) | vet.doc | CC-BY 4.0 | текстуры WebP 1024², Meshopt |
| `baba-yaga.glb` | [Witch](https://sketchfab.com/3d-models/witch-2a7672475d514543b618b5a82fd5582b) | MAXDESIGN | CC-BY 4.0 | текстуры WebP, анимация прорежена, Meshopt |
| `vasilisa.glb` | [Red Slavic Folk Dress](https://sketchfab.com/3d-models/red-slavic-folk-dress-dc0fbf4dc6db4f3da414c5738ad02255) | akot777 | CC-BY 4.0 | упрощена 487k → ~56k треугольников, раскрашена цветами вершин (`scripts/vasilisaPaint.ts`), веточка из руки удалена |
