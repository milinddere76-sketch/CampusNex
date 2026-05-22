// ============================================================================
// CAMPUSNEX WHITE-LABEL DYNAMIC THEME ENGINE (PRODUCTION GRADE)
// ============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class WhiteLabelTheme extends ChangeNotifier {
  static final WhiteLabelTheme instance = WhiteLabelTheme._internal();

  WhiteLabelTheme._internal();

  // Default Fallback Color tokens (Apex Colors)
  Color _primaryColor = const Color(0xFF4F46E5);
  Color _secondaryColor = const Color(0xFF06B6D4);
  String _collegeName = 'Apex Institute';
  String? _logoUrl;

  // Getters
  Color get primaryColor => _primaryColor;
  Color get secondaryColor => _secondaryColor;
  String get collegeName => _collegeName;
  String? get logoUrl => _logoUrl;

  // Fetch Branding config dynamically by subdomain
  Future<void> fetchTenantBranding(String subdomain, String apiBaseUrl) async {
    try {
      final response = await http.get(Uri.parse('$apiBaseUrl/colleges/subdomain/$subdomain'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final branding = data['branding'];
          
          _collegeName = branding['name'] ?? 'Apex Institute';
          _logoUrl = branding['branding_logo_url'];
          
          // Parse HEX string safely to Flutter Color
          if (branding['branding_primary_color'] != null) {
            _primaryColor = _parseHexColor(branding['branding_primary_color']);
          }
          if (branding['branding_secondary_color'] != null) {
            _secondaryColor = _parseHexColor(branding['branding_secondary_color']);
          }

          print('🎨 WhiteLabelTheme: Loaded custom colors for [$_collegeName] successfully!');
          notifyListeners();
        }
      }
    } catch (e) {
      print('⚠️ WhiteLabelTheme: Failed to fetch online white-label metadata, keeping cache presets. $e');
    }
  }

  // Parse HEX color string like '#4F46E5' or '4F46E5'
  Color _parseHexColor(String hex) {
    String cleanHex = hex.replaceAll('#', '').trim();
    if (cleanHex.length == 6) {
      cleanHex = 'FF$cleanHex'; // Add full alpha opacity
    }
    return Color(int.parse(cleanHex, radix: 16));
  }

  // Generate customized Material 3 ThemeData dynamically
  ThemeData getThemeData(bool isDarkMode) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primaryColor,
      brightness: isDarkMode ? Brightness.dark : Brightness.light,
      primary: _primaryColor,
      secondary: _secondaryColor,
      background: isDarkMode ? const Color(0xFF0B0F19) : const Color(0xFFF8FAFC),
      surface: isDarkMode ? const Color(0xFF111827) : Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.background,
      fontFamily: 'Inter',
      appBarTheme: AppBarTheme(
        elevation: 0,
        backgroundColor: colorScheme.surface,
        foregroundColor: isDarkMode ? Colors.white : Colors.black87,
        centerTitle: true,
      ),
      cardTheme: CardTheme(
        color: colorScheme.surface,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isDarkMode ? Colors.white10 : Colors.black12,
            width: 0.5,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryColor,
          foregroundColor: Colors.white,
          elevation: 1,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
