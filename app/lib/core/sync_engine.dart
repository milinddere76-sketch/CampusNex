// ============================================================================
// CAMPUSNEX CLIENT OFFLINE-FIRST SYNC ENGINE (PRODUCTION GRADE)
// ============================================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'sqlite_db.dart';
import '../models/models.dart';

enum SyncStatus { onlineSynced, onlineSyncing, offline }

class SyncEngine extends ChangeNotifier {
  static final SyncEngine instance = SyncEngine._internal();
  
  SyncEngine._internal() {
    // Automatically poll network connectivity every 8 seconds
    _connectivityTimer = Timer.periodic(const Duration(seconds: 8), (_) => checkConnectivityAndSync());
  }

  // Configuration Params
  String _baseUrl = 'http://localhost:5000/api';
  bool _isOnline = true;
  SyncStatus _syncStatus = SyncStatus.onlineSynced;
  Timer? _connectivityTimer;
  bool _isSyncInProgress = false;

  // Getters
  bool get isOnline => _isOnline;
  SyncStatus get syncStatus => _syncStatus;
  
  // Set baseUrl dynamically for different tenant subdomains
  void setBaseUrl(String url) {
    _baseUrl = url;
    notifyListeners();
  }

  // Toggle offline manual simulation (useful for testing offline workflows)
  void setOfflineManual(bool offline) {
    _isOnline = !offline;
    _syncStatus = offline ? SyncStatus.offline : SyncStatus.onlineSynced;
    print('⚙️ SyncEngine: Connection manually set to [${_isOnline ? "ONLINE" : "OFFLINE"}]');
    notifyListeners();
    if (_isOnline) {
      checkConnectivityAndSync();
    }
  }

  // Primary Check Connection & Sync Flow
  Future<void> checkConnectivityAndSync() async {
    if (_isSyncInProgress) return;

    try {
      // Small HTTP ping check to see if central server is reachable
      final response = await http.get(Uri.parse('$_baseUrl/../')).timeout(const Duration(seconds: 3));
      
      if (response.statusCode == 200) {
        if (!_isOnline) {
          print('🟢 SyncEngine: Reconnection detected! Syncing SQLite queue...');
        }
        _isOnline = true;
        
        // Trigger Sync if queue is populated
        await synchronizeQueue();
      } else {
        _isOnline = false;
        _syncStatus = SyncStatus.offline;
        notifyListeners();
      }
    } catch (e) {
      // Timeout or connection error -> Offline mode
      if (_isOnline) {
        print('🔴 SyncEngine: Central server unreachable. Safe switching to offline queue buffer.');
      }
      _isOnline = false;
      _syncStatus = SyncStatus.offline;
      notifyListeners();
    }
  }

  // Sync sqlite queue database payload up to central PostgreSQL
  Future<void> synchronizeQueue() async {
    final queuedTasks = await SqliteDbHelper.instance.getQueuedTasks();
    if (queuedTasks.isEmpty) {
      _syncStatus = SyncStatus.onlineSynced;
      notifyListeners();
      return;
    }

    _isSyncInProgress = true;
    _syncStatus = SyncStatus.onlineSyncing;
    notifyListeners();

    print('🔄 SyncEngine: Syncing ${queuedTasks.length} queued transactions...');

    try {
      // Map tasks to JSON array
      final queueJson = queuedTasks.map((t) => {
        'action_type': t.actionType,
        'target_table': t.targetTable,
        'record_id': t.recordId,
        'payload': t.payload,
        'client_timestamp': t.clientTimestamp,
      }).toList();

      final response = await http.post(
        Uri.parse('$_baseUrl/sync/process'),
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'apex' // default demo tenant header
        },
        body: jsonEncode({
          'device_id': 'flutter_mobile_client_v1',
          'queue': queueJson
        })
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          print('🟢 SyncEngine: Queue successfully processed by backend Postgres!');
          
          // Clear successfully processed tasks from local SQLite
          for (final task in queuedTasks) {
            if (task.id != null) {
              await SqliteDbHelper.instance.removeSyncTask(task.id!);
            }
          }
          
          _syncStatus = SyncStatus.onlineSynced;
        } else {
          _syncStatus = SyncStatus.onlineSynced; // Sync resolved but failed logical validations
        }
      } else {
        _syncStatus = SyncStatus.offline;
      }
    } catch (e) {
      print('⚠️ SyncEngine: Batch sync HTTP upload failed, retrying later. Error: $e');
      _syncStatus = SyncStatus.offline;
    } finally {
      _isSyncInProgress = false;
      notifyListeners();
    }
  }

  // Wrap write mutations in sqlite & sync triggers
  Future<void> performMutation({
    required String actionType,
    required String targetTable,
    required String recordId,
    required Map<String, dynamic> payload,
  }) async {
    
    // Create new Task
    final task = OfflineSyncTask(
      actionType: actionType,
      targetTable: targetTable,
      recordId: recordId,
      payload: payload,
      clientTimestamp: DateTime.now().toIso8601String(),
    );

    // Always record locally in SQLite first (Offline-First Integrity)
    await SqliteDbHelper.instance.enqueueSyncTask(task);

    // If online, immediately trigger sync. Else notify listeners.
    if (_isOnline) {
      await synchronizeQueue();
    } else {
      _syncStatus = SyncStatus.offline;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _connectivityTimer?.cancel();
    super.dispose();
  }
}
