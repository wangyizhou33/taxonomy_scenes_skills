# Physical Work Atlas — interactive embodied AI taxonomy

A dependency-free, offline-ready website for exploring and editing a **four-layer taxonomy of human physical work** for egocentric manipulation data curation.

## Launch

Open **`index.html`** in Chrome, Safari, Firefox, or Edge. The app runs offline with no installation or build step.

If your browser restricts local files or local storage, serve the folder with a static server:

```bash
cd physical_work_taxonomy_web
python3 -m http.server 8000
# Open http://localhost:8000
```

## Deploy to GitHub Pages

On the GitHub repository, choose **Settings → Pages → Source → GitHub Actions**. The `Deploy to GitHub Pages` workflow runs on pushes to `main`. You can also run it manually from **Actions** on the `main` branch. Once the deployment succeeds, **Settings → Pages** shows the website URL.

## Contents

- `index.html` — page layout and UI elements
- `style.css` — responsive application styles
- `particles.js` — pointer-responsive domain illustrations with reduced-motion support
- `taxonomy-data.js` — full editable seed dataset and physical skill families
- `assets/domains/` — local copies of the 20 domain photographs. The image credits link to the source pages, and the photos are used under the [Pexels License](https://www.pexels.com/license/).
- `capacity-data.js` and `assets/capacity/` — mapped capacity records and column F photos from the 场景贴图 worksheet
- `radial-overview.js` — domain, scene, and record-photo rings in the overview
- `coverage.js` — reported collection volumes, mappings to the seed taxonomy, and the interactive coverage chart
- `app.js` — workflow map, tree navigation, search, editor, skill tags, coverage, JSON import/export, and browser persistence

## Data coverage

The seed contains **20 L1 domains, 103 L2 physical scenes, 103 L3 workflows, and 241 example L4 concrete tasks**. All 20 sectors are represented, even if your current dataset does not cover them.

Hierarchy:

- **L1 Domain** — societal work area (e.g. industrial manufacturing)
- **L2 Scene** — physical environment (e.g. electronic assembly line)
- **L3 Workflow** — goal-directed work procedure (e.g. wiring harness assembly)
- **L4 Task** — concrete observable action (e.g. align and insert connector)

The deeper levels consist of illustrative, extensible starting nodes; the taxonomy is **not an exhaustive listing of every physical task**.

## Using the interface

- Select a domain on the left or open **All domains**. Use **Show all** or **Show existing capacity** above the explorer to filter the domain list and scene views. Select a ring sector or choose from the overview filters to focus a domain or scene. Hover or focus a photo to enlarge it, or click it to open the original. The radial labels identify source rows and venue types.
- Choose **中** (中文) or **英** (English) in the header. The selection is saved in this browser, and the starter taxonomy includes both labels at all four levels.
- Use the sun or moon next to the language selector to switch between Bright and Dark. The browser remembers the selected theme.
- In **Map**, choose a scene under **Physical scenes**. Its default workflow opens automatically, and you can select another workflow to see that workflow’s tasks. Switch to **Tree** to expand several scenes at once.
- Click any node to inspect its full hierarchy and description.
- Search globally using the search box (`/` or Ctrl/Cmd+K).
- Click **+ Add child** to create a scene, workflow, or task.
- Click **Edit** to rename a node, add an English translation, or provide definitions.
- Newly created nodes can be deleted. Preinstalled nodes are edit-protected against deletion but can be renamed.
- The 241 starter L4 tasks have editable skill tags based on their observable actions. Open a task in the inspector, then drag a skill card onto a task block or the inspector’s drop area. You can also click, tap, or use the keyboard to toggle a skill. **Skill taxonomy** groups tagged tasks across domains.
- Open **Coverage** to compare **Actual volume** with **Ideal taxonomy** at L1–L4. Select a pie slice or legend row to see its details and drill down where available. The source mapping table lists the reported categories, volumes scaled by 20, and mapping decisions.
- Set a task’s **Collection status** to Curated or Planned. The **Task planning** section under **Coverage** counts tasks by status. Tasks without a status appear as Untracked.
- **Export JSON** saves the entire taxonomy, edits, skill annotations, and collection statuses.
- **Import** reloads a compatible exported JSON. This replaces the current browser workspace after confirmation.
- **Reset** restores the original taxonomy and removes local edits after confirmation.

## Existing capacity

Capacity records are mapped separately from the ideal taxonomy. The source worksheet contains 468 populated records. The mapping combines the collection category, venue type, and venue names from columns A–C. Where these support a more specific setting than the ideal taxonomy covers, the explorer displays a capacity scene under the existing domain. For identified scene types, the explorer shows reference workflows and observable tasks chosen for a strong fit with the setting. These examples are surfaced in both navigator views and the skill ontology. Task planning counts continue to reflect tasks with editable collection status. Entries without an available scene appear in an **Unclassified** scene under their domain. The scene record counts add up to the domain total. Unclassified scenes have no reference workflows because the scene type is unknown. The detail panel shows source row numbers, categories, venue types, and embedded photos from column F. A capacity record represents a worksheet entry. The collection-volume report and task planning retain their own measures.

## Persistence / privacy

Edits, skill tags, and collection statuses are stored in this browser's `localStorage`. Nothing is sent to a server. Some browsers restrict persistence for `file://` pages, so **Export JSON** is recommended as your durable backup, or open the app from a static local server.

## Interoperable JSON

Export format:

```json
{
  "schema_version": 1,
  "exported_at": "<ISO-8601 timestamp>",
  "description": "Universal Human Physical Work Taxonomy — 4 levels",
  "taxonomy": [
    {
      "id": "D03",
      "type": "domain",
      "label": "工业制造",
      "en": "Manufacturing",
      "children": [
        { "id": "D03-S01", "type": "scene", "label": "汽车与机械装配", "children": [
          { "id": "D03-S01-W01", "type": "workflow", "label": "零部件装配", "children": [
            { "id": "D03-S01-W01-T01", "type": "task", "label": "对孔", "skills": [], "children": [] }
          ] }
        ] }
      ]
    }
  ],
  "skill_families": []
}
```

The `skill_families` array is reference metadata; **L4 `skills` arrays** hold the actual task-level annotations, keyed by skill family ID. Import accepts either the exported wrapper or a raw root-level domain array.

Exports include `skills_initialized: true` on tagged starter tasks and tasks whose skills have been edited, so a deliberately cleared list stays empty after reimport. An older workspace with an empty list on a matching starter task receives the starter tags. Existing annotations are retained.

An L4 task can also include a `coverage` property with one of three values, `untracked`, `planned`, or `curated`. It controls the browser-local task planning counts. The reported dataset volumes use the mapping in `coverage.js`, which targets the seed taxonomy by ID. The source totals support L1 allocation. For L2 through L4, the chart identifies volume pending allocation and shows the ideal structure by node count when selected.

## Modeling conventions

- A task belongs to one primary four-level taxonomy path; multi-domain activities may need cross-references or multiple episode labels.
- Physical skill tags are orthogonal and may be multi-label.
- The L1 special-environments domain is a practical catch-all; for formal sectoral reporting, classify by societal function and add an independent environment-type field.
- A scene taxonomy measures work-context coverage; skill labels measure transfer-relevant capability coverage.
- Defining objective task start states, success conditions, safety constraints, and annotation provenance is advisable when operationalizing the seed into a production data catalog.

This is a **proposed ontology** for embodied data curation, not an official standard or a replacement for ISIC/ISCO.
