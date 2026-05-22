// ============================================================================
// CAMPUSNEX CROSS-PLATFORM FLUTTER ENTRYPOINT (PRODUCTION GRADE)
// ============================================================================

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/sync_engine.dart';
import 'core/white_label_theme.dart';
import 'screens/student_dashboard.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CampusNexApp());
}

class CampusNexApp extends StatelessWidget {
  const CampusNexApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<SyncEngine>.value(
          value: SyncEngine.instance,
        ),
        ChangeNotifierProvider<WhiteLabelTheme>.value(
          value: WhiteLabelTheme.instance,
        ),
      ],
      child: Consumer<WhiteLabelTheme>(
        builder: (context, whiteLabel, child) {
          // Generate customized light/dark Material 3 themes based on active college colors
          return MaterialApp(
            title: 'CampusNex Portal',
            debugShowCheckedModeBanner: false,
            theme: whiteLabel.getThemeData(false), // Light Theme
            darkTheme: whiteLabel.getThemeData(true), // Dark Theme
            themeMode: ThemeMode.system, // Auto adaptive
            home: const StudentDashboardScreen(),
          );
        },
      ),
    );
  }
}
