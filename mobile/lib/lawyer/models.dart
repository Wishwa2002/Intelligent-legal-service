class LawyerProfile {
  final String name,
      email,
      phone,
      qualification,
      practiceArea,
      license,
      description,
      status;
  final int experience;
  LawyerProfile.fromJson(Map<String, dynamic> j)
    : name = j['name'] ?? '',
      email = j['email'] ?? '',
      phone = j['phoneNumber'] ?? '',
      qualification = j['qualification'] ?? '',
      practiceArea = j['practiceArea'] ?? '',
      license = j['licenseNumber'] ?? '',
      description = j['profileDescription'] ?? '',
      status = j['status'] ?? '',
      experience = j['experience'] ?? 0;
}

class LawyerAppointment {
  final String id,
      client,
      date,
      start,
      end,
      status,
      practiceArea,
      legalService,
      description,
      consultationType;
  final bool canConfirm, canComplete;
  LawyerAppointment.fromJson(Map<String, dynamic> j)
    : id = j['appointmentId'],
      client = j['customerName'] ?? '',
      date = j['date'],
      start = j['startTime'],
      end = j['endTime'],
      status = j['status'],
      practiceArea = j['practiceArea'] ?? '',
      legalService = j['legalService'] ?? '',
      description = j['description'] ?? '',
      consultationType = j['consultationType'] ?? '',
      canConfirm = j['canConfirm'] == true,
      canComplete = j['canComplete'] == true;
  String get time => '${start.substring(0, 5)}–${end.substring(0, 5)}';
}

class LawyerDashboardSummary {
  final LawyerProfile lawyer;
  final int today, upcoming, pending, completed;
  final LawyerAppointment? next;
  final String timeZone;
  LawyerDashboardSummary.fromJson(Map<String, dynamic> j)
    : lawyer = LawyerProfile.fromJson(j['lawyer']),
      today = j['counts']['today'],
      upcoming = j['counts']['upcoming'],
      pending = j['counts']['pending'],
      completed = j['counts']['completed'],
      next = j['nextAppointment'] == null
          ? null
          : LawyerAppointment.fromJson(j['nextAppointment']),
      timeZone = j['timeZone'];
}

class LawyerWorkingDay {
  final int day;
  bool working;
  String start, end;
  LawyerWorkingDay.fromJson(Map<String, dynamic> j)
    : day = j['dayOfWeek'],
      working = j['isWorkingDay'],
      start = j['startTime'],
      end = j['endTime'];
  Map<String, dynamic> toJson() => {
    'dayOfWeek': day,
    'isWorkingDay': working,
    'startTime': start,
    'endTime': end,
  };
}

class LawyerSchedule {
  int duration;
  final List<LawyerWorkingDay> days;
  final String timeZone;
  final bool configured;
  LawyerSchedule.fromJson(Map<String, dynamic> j)
    : duration = j['appointmentDurationMinutes'],
      days = (j['days'] as List)
          .map((d) => LawyerWorkingDay.fromJson(d))
          .toList(),
      timeZone = j['timeZone'],
      configured = j['hasConfiguredSchedule'] == true;
  Map<String, dynamic> toJson() => {
    'appointmentDurationMinutes': duration,
    'days': days.map((d) => d.toJson()).toList(),
  };
}

class LawyerUnavailability {
  final String id, reason;
  final DateTime start, end;
  final bool fullDay;
  LawyerUnavailability.fromJson(Map<String, dynamic> j)
    : id = j['id'],
      reason = j['reason'],
      start = DateTime.parse(j['startDateTime']),
      end = DateTime.parse(j['endDateTime']),
      fullDay = j['isFullDay'];
}
