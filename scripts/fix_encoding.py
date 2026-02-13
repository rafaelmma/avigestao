import os

replacements = [
    ('Ã¡', 'á'),
    ('Ã©', 'é'),
    ('Ã­', 'í'),
    ('Ã³', 'ó'),
    ('Ãº', 'ú'),
    ('Ã¢', 'â'),
    ('Ãª', 'ê'),
    ('Ã´', 'ô'),
    ('Ã£', 'ã'),
    ('Ãµ', 'õ'),
    ('Ã§', 'ç'),
    ('Ã€', 'À'),
    ('Ã', 'Á'),
    ('Ã‰', 'É'),
    ('Ã', 'Í'),
    ('Ã“', 'Ó'),
    ('Ãš', 'Ú'),
    ('Ã‡', 'Ç'),
    ('ÃŠ', 'Ê'),
    ('Ã’', 'Ò'),
    ('ðŸ¦', '🐦'),
    ('ðŸ†', '🏆'),
    ('ðŸ‘‘', '👑'),
    ('ðŸ’¡', '💡'),
    ('ðŸ“ˆ', '📈'),
    ('âœ¨', '✨'),
    ('âŒ', '❌'),
    ('â„¹ï¸', 'ℹ️'),
    ('âœ“', '✓'),
    ('â—‹', '○'),
    ('ðŸ‘¥', '👥'),
    ('ðŸ§¬', '🧬'),
    ('ðŸ“‹', '📋'),
    ('â€¢', '•'),
    ('Ã—', '×'),
]

pages_dir = r'c:\avigestao\pages'

for filename in os.listdir(pages_dir):
    if filename.endswith('.tsx') or filename.endswith('.ts'):
        filepath = os.path.join(pages_dir, filename)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        new_content = content
        for old, new in replacements:
            new_content = new_content.replace(old, new)
        
        if new_content != content:
            print(f"Fixing encoding in {filename}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
