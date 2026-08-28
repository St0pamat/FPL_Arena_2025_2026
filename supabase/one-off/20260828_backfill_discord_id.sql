-- Jednorazowy backfill discord_id (tylko to pole — reszta teams bez zmian).
-- Dopasowanie: fpl_id + manager_name (oba muszą pasować).
-- Wiersze bez Discord_User_ID są pomijane (discord_id w bazie zostaje jak było).
--
-- PRZED uruchomieniem: uruchom sekcję „1. Podgląd dopasowań”.
-- PO UPDATE: sprawdź sekcję „3. Weryfikacja”.

-- ─── 1. Podgląd dopasowań (SELECT — nic nie zmienia) ───────────────────────
WITH staging AS (
  SELECT * FROM (VALUES
    ('7212',       'St0pa | FPL Arena',              '1097839268405194833'),
    ('254991',     'Chef Juan',                      '358303576390500353'),
    ('694',        'Marcin Kaczorowski',             '786676004961255434'),
    ('740116',     'Jakub Nowicki',                  '1537113756595920936'),
    ('15823',      'Ola Gołaszewska --FPL-Ola-',     '694852292154753044'),
    ('1862631',    'Sebastian G',                    '1047576372714946620'),
    ('11002',      'Klaudia Rykowska',               '1276217356531535945'),
    ('3560',       'Marek Kosiński',                 '692673248332349440'),
    ('223163',     'Sebastian Towarek',              '1135942603045601410'),
    ('2023',       'LFC 3palczasty',                 '581580317656088587'),
    ('749',        'Patryk Tritt',                   '522751488439877635'),
    ('35929',      'Michał Szczurek',                '839890459408728084'),
    ('43606',      'Marcel Kapala',                  '867866556481536051'),
    ('4909',       'Paweł Szelągowski',              '448237663485689867'),
    ('498762',     'Miłosz Świętochowski',           '691978799469821953'),
    ('5352',       'Sebastian Zgliński',             '272865404999827457'),
    ('10755',      'Mateusz Szostak',                '1197543835379712131'),
    ('1603',       'Julian P',                       '924001891724173413'),
    ('1518660',    'Mateusz Biernacki',              '1134542931240431776'),
    ('34078',      'Konrad Buć',                     '240922348969132032'),
    ('1883135',    'Maciej Czyżewski',               '1187486636137791701'),
    ('15263',      'Krzysztof Zuchwalski',           '908038535586652231'),
    ('594006',     'Michał Owsiak',                  '1403654946502606868'),
    ('106602',     'Noel Gucajtis',                  '357651205247467520'),
    ('319712',     'Dawid Rapciak',                  '592980286044635156'),
    ('22767',      'Dariusz Trzepizur',              '368040185025265667'),
    ('193471',     'Klaudiusz Buczy',                '611205169270751251'),
    ('117609',     'Pawel Grzesik',                  '1458932753646092505'),
    ('4671',       'Łukasz Badełek',                 '1528820379215204478'),
    ('356080',     'Michał Czarnota',                '687498510547156999'),
    ('586935',     'Łukasz Gierczak',                '593363979938824204'),
    ('39752',      'Maciej Kopczyński',              '1250296090536841241'),
    ('372818',     'Ferdynand Lipski',               '207880466487836674'),
    ('252348',     'Maciej Brzyk',                   '1206271542938570763'),
    ('3047',       'Bartłomiej Włodarski',           '403576350306205698'),
    ('7121',       'Leszek Brze21na -MorfeuszEKMA',  '950263726622249000'),
    ('290840',     'Dawid Życzyński',                '1473254109976199292'),
    ('204762',     'Sergiusz Kaczmarek',             '733641732088135773'),
    ('18939',      'Bartosz Pompka',                 '227504915919011840'),
    ('337244',     'Rafal Juszczak',                 '1535932835121332245'),
    ('1883467',    'Bartosz Pietrzak',               '1188828117939269633'),
    ('8919',       'Dawid Panus',                    '649704049859624970'),
    ('731584',     'Pawel P.',                       '1187483115132817550'),
    ('3822480',    'Kacper Stasak',                  '1400130347823530228')
  ) AS v(fpl_id, manager_name, discord_id)
)
SELECT
  s.fpl_id,
  s.manager_name AS excel_manager,
  s.discord_id AS new_discord_id,
  t.id AS team_id,
  t.manager_name AS db_manager,
  t.discord_id AS old_discord_id,
  CASE
    WHEN t.id IS NULL THEN '❌ brak gracza w bazie (sprawdź FPL ID / Manager)'
    WHEN t.discord_id IS NOT DISTINCT FROM s.discord_id THEN '✓ już OK'
    ELSE '→ do aktualizacji'
  END AS status
FROM staging s
LEFT JOIN public.teams t
  ON t.fpl_id = s.fpl_id
 AND t.manager_name = s.manager_name
ORDER BY status DESC, s.manager_name;

-- ─── 2. UPDATE (tylko discord_id) ─────────────────────────────────────────────
-- Uruchom po sprawdzeniu podglądu (sekcja 1).

BEGIN;

WITH staging AS (
  SELECT * FROM (VALUES
    ('7212',       'St0pa | FPL Arena',              '1097839268405194833'),
    ('254991',     'Chef Juan',                      '358303576390500353'),
    ('694',        'Marcin Kaczorowski',             '786676004961255434'),
    ('740116',     'Jakub Nowicki',                  '1537113756595920936'),
    ('15823',      'Ola Gołaszewska --FPL-Ola-',     '694852292154753044'),
    ('1862631',    'Sebastian G',                    '1047576372714946620'),
    ('11002',      'Klaudia Rykowska',               '1276217356531535945'),
    ('3560',       'Marek Kosiński',                 '692673248332349440'),
    ('223163',     'Sebastian Towarek',              '1135942603045601410'),
    ('2023',       'LFC 3palczasty',                 '581580317656088587'),
    ('749',        'Patryk Tritt',                   '522751488439877635'),
    ('35929',      'Michał Szczurek',                '839890459408728084'),
    ('43606',      'Marcel Kapala',                  '867866556481536051'),
    ('4909',       'Paweł Szelągowski',              '448237663485689867'),
    ('498762',     'Miłosz Świętochowski',           '691978799469821953'),
    ('5352',       'Sebastian Zgliński',             '272865404999827457'),
    ('10755',      'Mateusz Szostak',                '1197543835379712131'),
    ('1603',       'Julian P',                       '924001891724173413'),
    ('1518660',    'Mateusz Biernacki',              '1134542931240431776'),
    ('34078',      'Konrad Buć',                     '240922348969132032'),
    ('1883135',    'Maciej Czyżewski',               '1187486636137791701'),
    ('15263',      'Krzysztof Zuchwalski',           '908038535586652231'),
    ('594006',     'Michał Owsiak',                  '1403654946502606868'),
    ('106602',     'Noel Gucajtis',                  '357651205247467520'),
    ('319712',     'Dawid Rapciak',                  '592980286044635156'),
    ('22767',      'Dariusz Trzepizur',              '368040185025265667'),
    ('193471',     'Klaudiusz Buczy',                '611205169270751251'),
    ('117609',     'Pawel Grzesik',                  '1458932753646092505'),
    ('4671',       'Łukasz Badełek',                 '1528820379215204478'),
    ('356080',     'Michał Czarnota',                '687498510547156999'),
    ('586935',     'Łukasz Gierczak',                '593363979938824204'),
    ('39752',      'Maciej Kopczyński',              '1250296090536841241'),
    ('372818',     'Ferdynand Lipski',               '207880466487836674'),
    ('252348',     'Maciej Brzyk',                   '1206271542938570763'),
    ('3047',       'Bartłomiej Włodarski',           '403576350306205698'),
    ('7121',       'Leszek Brze21na -MorfeuszEKMA',  '950263726622249000'),
    ('290840',     'Dawid Życzyński',                '1473254109976199292'),
    ('204762',     'Sergiusz Kaczmarek',             '733641732088135773'),
    ('18939',      'Bartosz Pompka',                 '227504915919011840'),
    ('337244',     'Rafal Juszczak',                 '1535932835121332245'),
    ('1883467',    'Bartosz Pietrzak',               '1188828117939269633'),
    ('8919',       'Dawid Panus',                    '649704049859624970'),
    ('731584',     'Pawel P.',                       '1187483115132817550'),
    ('3822480',    'Kacper Stasak',                  '1400130347823530228')
  ) AS v(fpl_id, manager_name, discord_id)
)
UPDATE public.teams t
SET discord_id = s.discord_id
FROM staging s
WHERE t.fpl_id = s.fpl_id
  AND t.manager_name = s.manager_name
  AND s.discord_id IS NOT NULL
  AND btrim(s.discord_id) <> ''
  AND t.discord_id IS DISTINCT FROM s.discord_id;

COMMIT;

-- ─── 3. Weryfikacja po UPDATE ─────────────────────────────────────────────────
SELECT manager_name, fpl_id, discord_id
FROM public.teams
WHERE fpl_id IN (
  '7212','254991','694','740116','15823','1862631','11002','3560','223163',
  '2023','749','35929','43606','4909','498762','5352','10755','1603',
  '1518660','34078','1883135','15263','594006','106602','319712','22767',
  '193471','117609','4671','356080','586935','39752','372818','252348',
  '3047','7121','290840','204762','18939','337244','1883467','8919',
  '731584','3822480'
)
ORDER BY manager_name;

-- Pominięci (brak Discord_User_ID w pliku — celowo bez UPDATE):
-- Achim Faber (2261), Piotr Pesta (6872), Stanisław Ajchhorst (3963841),
-- Józef Filiński (1144), Kamil Dworzecki (110358), Ada Balonik (340595)
