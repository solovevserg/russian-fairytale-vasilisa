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
