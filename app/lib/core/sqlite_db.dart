// ============================================================================
// CAMPUSNEX SQLite OFFLINE DATABASE MANAGER (PRODUCTION GRADE)
// ============================================================================

import 'dart:async';
import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/models.dart';

class SqliteDbHelper {
  static final SqliteDbHelper instance = SqliteDbHelper._init();
  static Database? _database;

  SqliteDbHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('campusnex_local.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    const idType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const textType = 'TEXT NOT NULL';
    const textNullable = 'TEXT';
    const integerType = 'INTEGER NOT NULL';
    const realNullable = 'REAL';

    // 1. Create Local Attendance Cache Table
    await db.execute('''
      CREATE TABLE local_attendance (
        id TEXT PRIMARY KEY,
        student_id $textType,
        class_id $integerType,
        date $textType,
        status $textType,
        method $textType,
        verified_by_faculty_id $textNullable,
        latitude $realNullable,
        longitude $realNullable
      )
    ''');

    // 2. Create Local Chat Cache Table
    await db.execute('''
      CREATE TABLE local_chat_messages (
        id $idType,
        sender_id $textType,
        receiver_id $textType,
        message $textType,
        file_url $textNullable,
        sent_at $textType
      )
    ''');

    // 3. Create Local Notices Table
    await db.execute('''
      CREATE TABLE local_notices (
        id $integerType PRIMARY KEY,
        title $textType,
        content $textType,
        audience_roles $textType, -- Stored as comma separated values
        attachment_url $textNullable,
        created_at $textType
      )
    ''');

    // 4. Create SQLite Offline Mutations Sync Queue Table
    await db.execute('''
      CREATE TABLE offline_sync_queue (
        id $idType,
        action_type $textType, -- CREATE, UPDATE, DELETE
        target_table $textType,
        record_id $textType,
        payload $textType, -- JSON String
        client_timestamp $textType
      )
    ''');

    // Create performance indexes
    await db.execute('CREATE INDEX idx_local_att_date ON local_attendance (date)');
    await db.execute('CREATE INDEX idx_offline_queue_time ON offline_sync_queue (client_timestamp)');
  }

  // ============================================================================
  // SQLite CRUD HELPERS FOR ATTENDANCE
  // ============================================================================
  Future<int> cacheAttendance(Attendance att) async {
    final db = await instance.database;
    return await db.insert(
      'local_attendance',
      att.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Attendance>> getCachedAttendance() async {
    final db = await instance.database;
    final result = await db.query('local_attendance', orderBy: 'date DESC');
    return result.map((json) => Attendance.fromMap(json)).toList();
  }

  // ============================================================================
  // SQLite CRUD HELPERS FOR CHAT MESSAGES
  // ============================================================================
  Future<int> cacheChatMessage(ChatMessage msg) async {
    final db = await instance.database;
    return await db.insert('local_chat_messages', msg.toMap());
  }

  Future<List<ChatMessage>> getCachedChats(String currentUserId) async {
    final db = await instance.database;
    final result = await db.query(
      'local_chat_messages',
      where: 'sender_id = ? OR receiver_id = ?',
      whereArgs: [currentUserId, currentUserId],
      orderBy: 'sent_at ASC',
    );
    return result.map((json) => ChatMessage.fromMap(json)).toList();
  }

  // ============================================================================
  // SQLite OFFLINE SYNC QUEUE MANAGEMENT
  // ============================================================================
  Future<int> enqueueSyncTask(OfflineSyncTask task) async {
    final db = await instance.database;
    
    // Convert payload Map to JSON String for storage in SQLite TEXT column
    final row = {
      'action_type': task.actionType,
      'target_table': task.targetTable,
      'record_id': task.recordId,
      'payload': jsonEncode(task.payload),
      'client_timestamp': task.clientTimestamp,
    };
    
    print('💾 SQLite: Enqueuing sync action [${task.actionType}] for [${task.targetTable}]');
    return await db.insert('offline_sync_queue', row);
  }

  Future<List<OfflineSyncTask>> getQueuedTasks() async {
    final db = await instance.database;
    final result = await db.query('offline_sync_queue', orderBy: 'client_timestamp ASC');
    
    return result.map((row) {
      return OfflineSyncTask(
        id: row['id'] as int,
        actionType: row['action_type'] as String,
        targetTable: row['target_table'] as String,
        recordId: row['record_id'] as String,
        payload: jsonDecode(row['payload'] as String),
        clientTimestamp: row['client_timestamp'] as String,
      );
    }).toList();
  }

  Future<int> removeSyncTask(int id) async {
    final db = await instance.database;
    return await db.delete(
      'offline_sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future close() async {
    final db = await instance.database;
    db.close();
  }
}
