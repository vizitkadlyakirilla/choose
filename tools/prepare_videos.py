#!/usr/bin/env python3
"""Подготовка видео Кирилла для статического сайта (GitHub Pages).

Использование:
    python3 tools/prepare_videos.py <папка_с_исходниками> [--site .]

Что делает для каждого ролика из MAP (имена файлов — как на Яндекс Диске):
  1. Находит выразительный фрагмент 7 с: анализирует покадровую разницу (движение/монтаж),
     пропускает первую секунду и финальные 1.5 с (пэкшот/логотип). Можно задать START вручную.
  2. <id>-preview.mp4      — 1280px, H.264, без звука, faststart (фоновое превью)
     <id>-preview-640.mp4  — 640px для телефонов
     <id>-full.mp4         — полная версия со звуком (только если ролик ≤ FULL_MAX_SEC и файл < 95 МБ)
     <id>.jpg (posters/)   — постер из середины фрагмента
  3. Пишет assets/videos/manifest.js — сайт берёт видео только оттуда, поэтому
     несуществующих источников на странице не бывает.
Требуется ffmpeg/ffprobe.
"""
import json, os, subprocess, sys, statistics, shutil

MAP = {  # id: (имя исходного файла, ручной START или None)
    'gornaya':   ('Рекламой Горной с Гаджимурадом Рашидовым.mp4', None),
    'ahmad':     ('Реклама AHMAD TEA с Евгенией Медведевой.mp4', None),
    'twinby':    ('3.mp4.mov', None),
    'aliexpress':('Распродажа спортивных товаров.mp4', None),
    'dodo':      ('02_Edit_DoDo.mov', None),
    'bupas':     ('BUPAS GYM.mp4', None),
    'petlya':    ('Петля трейлер.mp4', None),
    'istoriya':  ('История одной смерти.mp4', None),
    'parody':    ('Пародия на сериалы нулевых.mp4', None),
    'navsyu':    ('На всю жизнь.mp4', None),
}
CLIP = 7.0
FULL_MAX_SEC = 180          # длиннее — только превью + внешний хостинг
GH_LIMIT = 95 * 1024 * 1024  # GitHub: жёсткий лимит 100 МБ на файл

def run(cmd): return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
def duration(p): return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).strip())

def best_start(src, dur):
    """Ищет окно CLIP секунд с максимальной средней сценической разницей кадров."""
    lo, hi = min(1.0, dur * .1), max(0.0, dur - 1.5 - CLIP)
    if hi <= lo: return max(0.0, (dur - CLIP) / 2)
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', "fps=4,scale=160:-2,select='gte(scene,0)',metadata=print:file=-", '-an', '-f', 'null', '-'],
                         capture_output=True, text=True).stdout
    t, scores = None, []
    for line in out.splitlines():
        if 'pts_time:' in line: t = float(line.split('pts_time:')[1].split()[0])
        elif 'lavfi.scene_score=' in line and t is not None: scores.append((t, float(line.split('=')[1])))
    if not scores: return lo
    best, bt = -1, lo
    s = lo
    while s <= hi:
        win = [v for (tt, v) in scores if s <= tt < s + CLIP]
        # движение важно, но одна резкая склейка не должна решать всё: медиана + среднее
        val = (statistics.mean(win) + statistics.median(win)) if win else 0
        if val > best: best, bt = val, s
        s += 0.5
    return bt

def enc(src, dst, ss, t, width, crf, audio):
    cmd = ['ffmpeg', '-y', '-v', 'error', '-ss', f'{ss:.2f}', '-i', src]
    if t: cmd += ['-t', f'{t:.2f}']
    cmd += ['-vf', f"scale='min({width},iw)':-2:flags=lanczos,format=yuv420p", '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
            '-profile:v', 'high', '-movflags', '+faststart']
    cmd += (['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] if audio else ['-an'])
    run(cmd + [dst])

def main():
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    src_dir = sys.argv[1]
    site = sys.argv[sys.argv.index('--site') + 1] if '--site' in sys.argv else os.path.join(os.path.dirname(__file__), '..')
    vdir, pdir = os.path.join(site, 'assets', 'videos'), os.path.join(site, 'assets', 'posters')
    os.makedirs(vdir, exist_ok=True)
    manifest, report = {}, []
    for vid, (name, manual) in MAP.items():
        src = os.path.join(src_dir, name)
        if not os.path.exists(src):
            report.append(f'{vid}: исходник не найден ({name})'); continue
        dur = duration(src)
        ss = manual if manual is not None else best_start(src, dur)
        t = min(CLIP, dur)
        enc(src, os.path.join(vdir, f'{vid}-preview.mp4'), ss, t, 1280, 27, False)
        enc(src, os.path.join(vdir, f'{vid}-preview-640.mp4'), ss, t, 640, 29, False)
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{ss + t / 2:.2f}', '-i', src, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', os.path.join(pdir, f'{vid}.jpg')])
        m = {'preview': f'assets/videos/{vid}-preview.mp4', 'previewMobile': f'assets/videos/{vid}-preview-640.mp4',
             'poster': f'assets/posters/{vid}.jpg', 'duration': round(dur, 1), 'clipStart': round(ss, 1)}
        if dur <= FULL_MAX_SEC:
            full = os.path.join(vdir, f'{vid}-full.mp4')
            enc(src, full, 0, None, 1280, 23, True)
            if os.path.getsize(full) > GH_LIMIT:
                enc(src, full, 0, None, 960, 27, True)
            if os.path.getsize(full) <= GH_LIMIT: m['full'] = f'assets/videos/{vid}-full.mp4'
            else: os.remove(full)
        manifest[vid] = m
        sz = sum(os.path.getsize(os.path.join(site, v)) for k, v in m.items() if k in ('preview', 'previewMobile', 'full'))
        report.append(f'{vid}: {dur:.1f} c, фрагмент с {ss:.1f} c, файлы {sz / 1e6:.1f} МБ' + ('' if 'full' in m else ' (полная версия — на внешний хостинг)'))
    with open(os.path.join(vdir, 'manifest.js'), 'w', encoding='utf-8') as f:
        f.write('/* Сгенерировано tools/prepare_videos.py — какие видео реально лежат в assets/videos. */\n')
        f.write('window.KP_VIDEOS = ' + json.dumps(manifest, ensure_ascii=False, indent=1) + ';\n')
    print('\n'.join(report))

if __name__ == '__main__': main()
