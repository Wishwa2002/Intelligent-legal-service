class AppointmentHistory {
  final String historyId;
  final String appointmentId;
  final String previousStatus;
  final String newStatus;
  final DateTime changedDate;

  const AppointmentHistory({
    required this.historyId,
    required this.appointmentId,
    required this.previousStatus,
    required this.newStatus,
    required this.changedDate,
  });

  factory AppointmentHistory.fromJson(Map<String, dynamic> json) {
    return AppointmentHistory(
      historyId: (json['historyId'] ?? '').toString(),
      appointmentId: (json['appointmentId'] ?? '').toString(),
      previousStatus: (json['previousStatus'] ?? '').toString(),
      newStatus: (json['newStatus'] ?? '').toString(),
      changedDate: DateTime.tryParse((json['changedDate'] ?? '').toString()) ?? DateTime.now(),
    );
  }
}

class Appointment {
  final String appointmentId;
  final String customerId;
  final String customerName;
  final String? customerEmail;
  final String lawyerId;
  final String lawyerName;
  final String? lawyerLicense;
  final String slotId;
  final String date;
  final String startTime;
  final String endTime;
  final String status;
  final String? description;
  final String consultationType;
  final String? legalServiceCategory;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool canConfirm;
  final bool canCancel;
  final bool canReschedule;
  final bool canComplete;
  final List<AppointmentHistory> history;

  const Appointment({
    required this.appointmentId,
    required this.customerId,
    required this.customerName,
    this.customerEmail,
    required this.lawyerId,
    required this.lawyerName,
    this.lawyerLicense,
    required this.slotId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.description,
    required this.consultationType,
    this.legalServiceCategory,
    required this.createdAt,
    this.updatedAt,
    this.canConfirm = false,
    this.canCancel = false,
    this.canReschedule = false,
    this.canComplete = false,
    this.history = const [],
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    var rawHist = json['history'];
    List<AppointmentHistory> histList = [];
    if (rawHist is List) {
      histList = rawHist.map((h) => AppointmentHistory.fromJson(h as Map<String, dynamic>)).toList();
    }

    return Appointment(
      appointmentId: (json['appointmentId'] ?? '').toString(),
      customerId: (json['customerId'] ?? '').toString(),
      customerName: (json['customerName'] ?? 'Client').toString(),
      customerEmail: json['customerEmail']?.toString(),
      lawyerId: (json['lawyerId'] ?? '').toString(),
      lawyerName: (json['lawyerName'] ?? 'Counsel').toString(),
      lawyerLicense: json['lawyerLicense']?.toString(),
      slotId: (json['slotId'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      status: (json['status'] ?? 'Requested').toString(),
      description: json['description']?.toString(),
      consultationType: (json['consultationType'] ?? 'Online').toString(),
      legalServiceCategory: json['legalServiceCategory']?.toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
      canConfirm: json['canConfirm'] == true,
      canCancel: json['canCancel'] == true,
      canReschedule: json['canReschedule'] == true,
      canComplete: json['canComplete'] == true,
      history: histList,
    );
  }

  String get formattedTimeSlot {
    String parseTime(String t) {
      final parts = t.split(':');
      if (parts.isEmpty) return t;
      int h = int.tryParse(parts[0]) ?? 0;
      final m = parts.length > 1 ? parts[1] : '00';
      final ampm = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h == 0) h = 12;
      return '$h:$m $ampm';
    }

    return '${parseTime(startTime)} – ${parseTime(endTime)}';
  }

  bool get isRequested => status.toLowerCase() == 'requested' || status.toLowerCase() == 'rescheduled';
  bool get isConfirmed => status.toLowerCase() == 'confirmed';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isCancelled => status.toLowerCase() == 'cancelled' || status.toLowerCase() == 'rejected';
}
