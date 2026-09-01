import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

console.log('🧹 ОЧИСТКА КЕША СЕССИИ ELECTRON\n');
console.log('='.repeat(60));

const appDataPath = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
const electronDataPath = join(appDataPath, 'CMSAdminPanel');

console.log('\nПуть к данным приложения:');
console.log(`   ${electronDataPath}\n`);

if (!existsSync(electronDataPath)) {
  console.log('✅ Папка не существует - кеш уже чист');
  console.log('\n📝 Просто откройте приложение и войдите заново');
  process.exit(0);
}

console.log('⚠️  ВНИМАНИЕ: Это удалит все локальные данные приложения:');
console.log('   - Сохраненные сессии');
console.log('   - Настройки приложения');
console.log('   - Куки и локальное хранилище');
console.log('\n🔴 ЗАКРОЙТЕ ПРИЛОЖЕНИЕ ПЕРЕД ПРОДОЛЖЕНИЕМ!');
console.log('\n⏳ Ожидание 5 секунд...');

setTimeout(() => {
  try {
    console.log('\n🧹 Удаление кеша...');
    rmSync(electronDataPath, { recursive: true, force: true });
    console.log('✅ Кеш успешно удален!\n');
    console.log('📝 Теперь:');
    console.log('   1. Откройте приложение');
    console.log('   2. Войдите с admin@gmail.com');
    console.log('   3. Code Library заработает');
    console.log('   4. Медиа загрузка заработает');
  } catch (error) {
    console.log('❌ Ошибка удаления:', error);
    console.log('\n⚠️  Возможно приложение еще открыто?');
    console.log('   Закройте его и попробуйте снова');
  }
}, 5000);
