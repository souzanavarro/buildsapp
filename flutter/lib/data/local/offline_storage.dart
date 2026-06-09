import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'dart:convert';

class OfflineStorage {
  static Database? _database;

  static Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB();
    return _database!;
  }

  static Future<Database> _initDB() async {
    String path = join(await getDatabasesPath(), 'rota_certa_offline.db');
    return await openDatabase(
      path,
      version: 2,
      onCreate: (db, version) async {
        await _createTables(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await db.execute('ALTER TABLE pending_sync ADD COLUMN last_error TEXT');
          await db.execute('ALTER TABLE pending_sync ADD COLUMN retry_count INTEGER DEFAULT 0');
          await db.execute('ALTER TABLE pending_sync ADD COLUMN server_version TEXT');
        }
      },
    );
  }

  static Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT,
        action TEXT,
        data TEXT,
        server_version TEXT,
        last_error TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ''');
  }

  static Future<void> queueSync(String table, String action, Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('pending_sync', {
      'table_name': table,
      'action': action,
      'data': jsonEncode(data),
    });
  }
}
