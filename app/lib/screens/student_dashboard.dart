// ============================================================================
// CAMPUSNEX FLUTTER STUDENT PORTAL & SYSTEM (PRODUCTION GRADE)
// ============================================================================

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/sync_engine.dart';
import '../core/sqlite_db.dart';
import '../core/white_label_theme.dart';
import '../models/models.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  final TextEditingController _chatController = TextEditingController();
  final List<String> _chatMessages = [];
  bool _isLocalOffline = false;

  @override
  void initState() {
    super.initState();
    _chatMessages.add("🤖 AI Tutor: Welcome! Ask me about 'Red-Black Trees' or 'database normalization' for instant rebalancing help.");
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<WhiteLabelTheme>(context);
    final syncEngine = Provider.of<SyncEngine>(context);

    // Dynamic Sync Badge Style
    Color syncBadgeColor;
    String syncBadgeText;
    IconData syncBadgeIcon;

    switch (syncEngine.syncStatus) {
      case SyncStatus.onlineSynced:
        syncBadgeColor = Colors.green;
        syncBadgeText = "SYNCED";
        syncBadgeIcon = Icons.check_circle;
        break;
      case SyncStatus.onlineSyncing:
        syncBadgeColor = Colors.amber;
        syncBadgeText = "SYNCING";
        syncBadgeIcon = Icons.sync;
        break;
      case SyncStatus.offline:
        syncBadgeColor = Colors.red;
        syncBadgeText = "OFFLINE";
        syncBadgeIcon = Icons.wifi_off;
        break;
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (themeProvider.logoUrl != null)
              Image.network(themeProvider.logoUrl!, width: 24, height: 24)
            else
              const Icon(Icons.school),
            const SizedBox(width: 8),
            Text(themeProvider.collegeName),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: syncBadgeColor.withOpacity(0.15),
              border: Border.all(color: syncBadgeColor.withOpacity(0.3)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Icon(syncBadgeIcon, size: 14, color: syncBadgeColor),
                const SizedBox(width: 4),
                Text(
                  syncBadgeText,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: syncBadgeColor,
                  ),
                ),
              ],
            ),
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. White-labeled Digital ID Card
              _buildDigitalIdCard(context, themeProvider),
              const SizedBox(height: 20),

              // 2. Metrics circular grid
              _buildAcademicIndicators(context, themeProvider),
              const SizedBox(height: 20),

              // 3. Simulated Bus Tracking GPS Widget
              _buildGpsTrackCard(context, themeProvider),
              const SizedBox(height: 20),

              // 4. Interactive Chat Assistant Tab
              _buildChatAssistant(context, themeProvider, syncEngine),
              const SizedBox(height: 20),

              // 5. Offline Sync simulator controls
              _buildOfflineSyncSimulator(context, syncEngine),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDigitalIdCard(BuildContext context, WhiteLabelTheme theme) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: [theme.primaryColor, theme.primaryColor.withOpacity(0.7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "DIGITAL CAMPUS PASS",
                  style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5),
                ),
                Icon(Icons.nfc, color: theme.secondaryColor, size: 24),
              ],
            ),
            const SizedBox(height: 15),
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white24,
                  child: Text(
                    "AD",
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 15),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Alex Doe",
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Roll: APEX-2024-CSE-004",
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13),
                    ),
                    Text(
                      "Dept: Computer Science",
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                    ),
                  ],
                )
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    "CGPA: 3.84",
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
                const Icon(Icons.qr_code_2, color: Colors.white, size: 30),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildAcademicIndicators(BuildContext context, WhiteLabelTheme theme) {
    return Row(
      children: [
        // Attendance circle
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  const Text("Attendance Rate", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 80,
                    width: 80,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CircularProgressIndicator(
                          value: 0.875,
                          strokeWidth: 8,
                          color: theme.primaryColor,
                          backgroundColor: theme.primaryColor.withOpacity(0.1),
                        ),
                        const Center(
                          child: Text(
                            "87.5%",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        )
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Academic standing
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Course Status", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.library_books, color: theme.secondaryColor, size: 18),
                      const SizedBox(width: 8),
                      const Text("CS-201: DSA", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text("• Homework 2: PENDING", style: TextStyle(fontSize: 11, color: Colors.amber)),
                  const Text("• Quiz 1 Grade: A+", style: TextStyle(fontSize: 11, color: Colors.green)),
                ],
              ),
            ),
          ),
        )
      ],
    );
  }

  Widget _buildGpsTrackCard(BuildContext context, WhiteLabelTheme theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.bus_alert, color: theme.secondaryColor, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      "Live GPS Shuttle tracking",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const Text("Line A - Active", style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.navigation, size: 16, color: Colors.blue),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Bus NY-72B-9102 is currently at Central Library stop, approaching Campus North Gate.",
                      style: TextStyle(fontSize: 11),
                    ),
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildChatAssistant(BuildContext context, WhiteLabelTheme theme, SyncEngine sync) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.chat_bubble_outline, color: theme.primaryColor),
                const SizedBox(width: 8),
                const Text(
                  "AI Homework assistant & Chat",
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListView.builder(
                padding: const EdgeInsets.all(10),
                itemCount: _chatMessages.length,
                itemBuilder: (context, index) {
                  final text = _chatMessages[index];
                  final isAi = text.startsWith("🤖");
                  return Align(
                    alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isAi ? Colors.black12 : theme.primaryColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        text,
                        style: TextStyle(
                          fontSize: 12,
                          color: isAi ? Colors.black87 : Colors.white,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatController,
                    decoration: const InputDecoration(
                      hintText: "Ask AI doubt about binary tree...",
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    final text = _chatController.text.trim();
                    if (text.isEmpty) return;

                    setState(() {
                      _chatMessages.add(text);
                    });
                    _chatController.clear();

                    // Simulate AI responder
                    Future.delayed(const Duration(milliseconds: 600), () {
                      setState(() {
                        String reply = "I'm logged offline. Reconnect to query complex database normalization structures.";
                        if (text.toLowerCase().contains("tree") || text.toLowerCase().contains("red black")) {
                          reply = "🤖 AI Tutor: Red-Black Trees rebalance double-red anomalies through rotations and node recoloring (Parent / Uncle flips).";
                        } else if (text.toLowerCase().contains("database") || text.toLowerCase().contains("normalize")) {
                          reply = "🤖 AI Tutor: Database Normalization isolates relations: 1NF resolves multi-values, 2NF removes partial dependency, 3NF clears transitive dependencies.";
                        }
                        _chatMessages.add(reply);
                      });
                    });
                  },
                  icon: Icon(Icons.send, color: theme.primaryColor),
                )
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineSyncSimulator(BuildContext context, SyncEngine sync) {
    return Card(
      color: Colors.orange.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text(
              "⚙️ SQLite Sync sandbox Engine controller",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton.icon(
                  onPressed: () => sync.setOfflineManual(true),
                  icon: const Icon(Icons.wifi_off),
                  label: const Text("Go Offline"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                ),
                ElevatedButton.icon(
                  onPressed: () => sync.setOfflineManual(false),
                  icon: const Icon(Icons.wifi),
                  label: const Text("Reconnect"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
