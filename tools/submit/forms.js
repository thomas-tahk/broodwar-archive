// Single source of truth for the submission forms. The issue templates in
// .github/ISSUE_TEMPLATE/submit-*.yml are generated from this (npm run submit:templates),
// and the parser reads issue bodies by these exact labels.

const input = (id, label, description, required = false) => ({ id, label, description, type: 'input', required });
const area = (id, label, description, required = false) => ({ id, label, description, type: 'textarea', required });
const choice = (id, label, description, options) => ({ id, label, description, type: 'dropdown', required: true, options });

export const FORMS = {
  event: {
    file: 'submit-event.yml',
    name: 'Submit: add an event',
    description: 'A tournament or league that is not in the archive yet.',
    fields: [
      input('event_id', 'Event id', 'Lowercase letters, numbers and dashes. Example: 2002-sky-osl', true),
      input('event_name', 'Event name', 'Example: 2002 SKY OSL', true),
      input('year', 'Year', 'Four digits.', true),
      input('league', 'League', 'Example: OSL. Blank if unknown.'),
      input('sponsor', 'Sponsor', 'Blank if unknown.'),
      input('broadcaster', 'Broadcaster', 'Blank if unknown.'),
      input('organizer', 'Organizer', 'Blank if unknown.'),
      input('series_id', 'Series id', 'Id of the series this belongs to, if it exists. Example: osl'),
      choice('tier', 'Tier', 'How big was it?', ['big', 'mid', 'small']),
      choice('event_kind', 'Kind of event', 'Pick the closest.', ['individual-league', 'team-league', 'international', 'cup', 'invitational', 'showmatch']),
      area('sources', 'Sources', 'Where this comes from. One link per line. At least one.', true),
    ],
  },
  match: {
    file: 'submit-match.yml',
    name: 'Submit: add a match',
    description: 'A series between two players that is not in the archive yet. The event and players must already exist.',
    fields: [
      input('event_id', 'Event id', 'The event this match belongs to. Example: 2001-sky-osl', true),
      input('match_id', 'Match id', 'Lowercase letters, numbers and dashes. Example: ro16-a-1', true),
      input('stage', 'Stage', 'Example: Round of 16. Blank if unknown.'),
      input('group', 'Group', 'Example: A. Blank if unknown.'),
      input('date', 'Date', 'YYYY-MM-DD. Blank if unknown.'),
      choice('format', 'Format', 'Best-of format.', ['Unknown', 'Bo1', 'Bo3', 'Bo5', 'Bo7']),
      input('player1', 'Player 1 id', 'Player id, not broadcast name. Example: boxer'),
      input('player2', 'Player 2 id', 'Player id. Example: garimto'),
      input('winner', 'Winner id', 'One of the two players. Blank if unknown.'),
      input('score', 'Score', 'Example: 1-0. Blank if unknown.'),
      area('games', 'Games', 'One game per line: set | map id | races | winner id. Use - for unknown. Races are T, P, Z or R for player 1 then player 2. Example: 1 | lost-temple | T P | boxer'),
      area('sources', 'Sources', 'Where this comes from. One link per line. At least one.', true),
    ],
  },
  copy: {
    file: 'submit-copy.yml',
    name: 'Submit: add a copy',
    description: 'A link to footage of a game in a match that is already listed.',
    fields: [
      input('event_id', 'Event id', 'Example: 2001-sky-osl', true),
      input('match_id', 'Match id', 'Example: ro16-a-1', true),
      input('game_number', 'Game number', 'Which game of the match. 1 for the first.', true),
      input('copy_link', 'Copy link', 'A link only. Please do not upload video.', true),
      choice('copy_kind', 'Kind of copy', 'Pick the closest.', ['fan-upload', 'ogn-official', 'ogn-ai-upscale', 'torrent', 'other']),
      input('title', 'Title', 'Title of the upload. Blank if unknown.'),
      input('uploader', 'Uploader', 'Blank if unknown.'),
      input('resolution', 'Resolution', 'Example: 480p. Blank if unknown.'),
      input('fps', 'Frame rate', 'Example: 30. Blank if unknown.'),
      input('segment_start', 'Segment start', 'If the upload holds several games: where this game starts, HH:MM:SS. Otherwise blank.'),
      input('segment_end', 'Segment end', 'Where this game ends, HH:MM:SS. Otherwise blank.'),
    ],
  },
  item: {
    file: 'submit-item.yml',
    name: 'Submit: add an item',
    description: "An article, interview, VOD list or other write-up about the archive's subjects.",
    fields: [
      input('item_id', 'Item id', 'Lowercase letters, numbers and dashes.', true),
      input('item_kind', 'Kind of item', 'Lowercase word. Example: interview, article, vod-list', true),
      input('title', 'Title', 'Title of the item.', true),
      input('date', 'Date', 'YYYY-MM-DD. Blank if unknown.'),
      input('language', 'Language', 'Example: en, ko. Blank if unknown.'),
      area('links', 'Links', 'One link per line. At least one. These are also the sources.', true),
      area('about', 'About', 'What it is about, one per line, as kind:id. Example: player:boxer, event:2001-sky-osl, match:2001-sky-osl/final', true),
    ],
  },
  fix: {
    file: 'submit-fix.yml',
    name: 'Submit: fix a record',
    description: 'Something in the archive is wrong. Change one field.',
    fields: [
      input('record', 'Record', 'Which record. Examples: event:2001-sky-osl, player:boxer, match:2001-sky-osl/final', true),
      input('field', 'Field', 'Field to change. Examples: name, year, winner, games.0.map (games are counted from 0)', true),
      input('new_value', 'New value', 'The correct value. Write null for unknown.', true),
      input('source', 'Source', 'A link that shows the correct value.', true),
    ],
  },
};

function yamlString(s) {
  return JSON.stringify(s); // JSON strings are valid YAML
}

function fieldYaml(f) {
  const lines = [
    `  - type: ${f.type}`,
    `    id: ${f.id}`,
    '    attributes:',
    `      label: ${yamlString(f.label)}`,
    `      description: ${yamlString(f.description)}`,
  ];
  if (f.options) lines.push('      options:', ...f.options.map((o) => `        - ${yamlString(o)}`));
  lines.push('    validations:', `      required: ${f.required}`);
  return lines.join('\n');
}

/** The text of one issue-form template. */
export function templateYaml(form) {
  const head = [
    `name: ${yamlString(form.name)}`,
    `description: ${yamlString(form.description)}`,
    'labels: ["submission"]',
    'body:',
  ];
  return `${head.join('\n')}\n${form.fields.map(fieldYaml).join('\n')}\n`;
}
