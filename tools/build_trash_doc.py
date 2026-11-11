#!/usr/bin/env python3
"""Собирает js/trash-doc.js из assets/docs/poslednii-shans-2013.txt (единственный источник текста сценария).
Запуск после правки текста: python3 tools/build_trash_doc.py"""
import json, os
root = os.path.join(os.path.dirname(__file__), '..')
text = open(os.path.join(root, 'assets/docs/poslednii-shans-2013.txt'), encoding='utf-8').read()
meta = {
  'file': 'ПОСЛЕДНИЙ_ШАНС_ФИНАЛ_2013_ТОЧНО_НОВЫЙ_2.doc',
  'title': '«ПОСЛЕДНИЙ ШАНС НА ЛЮБОВЬ 2: ВОЗВРАЩЕНИЕ МЕСТИ»',
  'year': '2013',
  'genre': 'боевик, мелодрама, фантастика, психологический триллер',
  'text': text,
}
with open(os.path.join(root, 'js/trash-doc.js'), 'w', encoding='utf-8') as f:
  f.write('/* Сгенерировано tools/build_trash_doc.py из assets/docs/poslednii-shans-2013.txt.\n   Вымышленный юмористический сценарий — пасхалка BulanOS, не настоящая работа Кирилла Буланова. */\n')
  f.write('window.BOS_TRASH_DOC = ' + json.dumps(meta, ensure_ascii=False) + ';\n')
print(len(text), 'chars')
