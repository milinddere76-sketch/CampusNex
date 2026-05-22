// ============================================================================
// CAMPUSNEX UNIFIED DART DATA MODELS (PRODUCTION GRADE)
// ============================================================================

class User {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? phone;
  final String? deviceId;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.deviceId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      fullName: json['full_name'],
      role: json['role'],
      phone: json['phone'],
      deviceId: json['device_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'phone': phone,
      'device_id': deviceId,
    };
  }
}

class Attendance {
  final String? id;
  final String studentId;
  final int classId;
  final String date;
  final String status;
  final String method;
  final String? verifiedByFacultyId;
  final double? latitude;
  final double? longitude;

  Attendance({
    this.id,
    required this.studentId,
    required this.classId,
    required this.date,
    required this.status,
    required this.method,
    this.verifiedByFacultyId,
    this.latitude,
    this.longitude,
  });

  factory Attendance.fromMap(Map<String, dynamic> map) {
    return Attendance(
      id: map['id']?.toString(),
      studentId: map['student_id'],
      classId: map['class_id'],
      date: map['date'],
      status: map['status'],
      method: map['method'] ?? 'MANUAL',
      verifiedByFacultyId: map['verified_by_faculty_id'],
      latitude: map['latitude'] != null ? double.tryParse(map['latitude'].toString()) : null,
      longitude: map['longitude'] != null ? double.tryParse(map['longitude'].toString()) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'student_id': studentId,
      'class_id': classId,
      'date': date,
      'status': status,
      'method': method,
      'verified_by_faculty_id': verifiedByFacultyId,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class Notice {
  final int id;
  final String title;
  final String content;
  final List<String> audienceRoles;
  final String? attachmentUrl;
  final String createdAt;

  Notice({
    required this.id,
    required this.title,
    required this.content,
    required this.audienceRoles,
    this.attachmentUrl,
    required this.createdAt,
  });

  factory Notice.fromJson(Map<String, dynamic> json) {
    return Notice(
      id: json['id'],
      title: json['title'],
      content: json['content'],
      audienceRoles: List<String>.from(json['audience_roles'] ?? []),
      attachmentUrl: json['attachment_url'],
      createdAt: json['created_at'],
    );
  }
}

class ChatMessage {
  final int? id;
  final String senderId;
  final String receiverId;
  final String message;
  final String? fileUrl;
  final String sentAt;

  ChatMessage({
    this.id,
    required this.senderId,
    required this.receiverId,
    required this.message,
    this.fileUrl,
    required this.sentAt,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> map) {
    return ChatMessage(
      id: map['id'],
      senderId: map['sender_id'],
      receiverId: map['receiver_id'],
      message: map['message'],
      fileUrl: map['file_url'],
      sentAt: map['sent_at'] ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'sender_id': senderId,
      'receiver_id': receiverId,
      'message': message,
      'file_url': fileUrl,
      'sent_at': sentAt,
    };
  }
}

class OfflineSyncTask {
  final int? id;
  final String actionType; // CREATE, UPDATE, DELETE
  final String targetTable;
  final String recordId;
  final Map<String, dynamic> payload;
  final String clientTimestamp;

  OfflineSyncTask({
    this.id,
    required this.actionType,
    required this.targetTable,
    required this.recordId,
    required this.payload,
    required this.clientTimestamp,
  });

  factory OfflineSyncTask.fromMap(Map<String, dynamic> map) {
    return OfflineSyncTask(
      id: map['id'],
      actionType: map['action_type'],
      targetTable: map['target_table'],
      recordId: map['record_id'],
      payload: Map<String, dynamic>.from(map['payload']),
      clientTimestamp: map['client_timestamp'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'action_type': actionType,
      'target_table': targetTable,
      'record_id': recordId,
      'payload': payload,
      'client_timestamp': clientTimestamp,
    };
  }
}
