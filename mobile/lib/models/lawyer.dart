class LawyerSpecialization {
  final int specializationId;
  final String name;
  final String description;

  const LawyerSpecialization({
    required this.specializationId,
    required this.name,
    required this.description,
  });

  factory LawyerSpecialization.fromJson(Map<String, dynamic> json) {
    return LawyerSpecialization(
      specializationId: (json['specializationId'] ?? 0) as int,
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'specializationId': specializationId,
      'name': name,
      'description': description,
    };
  }
}

class AvailabilitySlot {
  final String slotId;
  final String availabilityId;
  final String date;
  final String startTime;
  final String endTime;
  final bool isBooked;

  const AvailabilitySlot({
    required this.slotId,
    required this.availabilityId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.isBooked,
  });

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlot(
      slotId: (json['slotId'] ?? '').toString(),
      availabilityId: (json['availabilityId'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      isBooked: json['isBooked'] == true,
    );
  }

  String get formattedTime {
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
}

class Lawyer {
  final String lawyerId;
  final String name;
  final String? email;
  final String phoneNumber;
  final String qualification;
  final int experience;
  final String licenseNumber;
  final String profileDescription;
  final String status;
  final List<LawyerSpecialization> specializations;

  const Lawyer({
    required this.lawyerId,
    required this.name,
    this.email,
    required this.phoneNumber,
    required this.qualification,
    required this.experience,
    required this.licenseNumber,
    required this.profileDescription,
    required this.status,
    required this.specializations,
  });

  factory Lawyer.fromJson(Map<String, dynamic> json) {
    var rawSpecs = json['specializations'];
    List<LawyerSpecialization> specs = [];
    if (rawSpecs is List) {
      specs = rawSpecs.map((s) => LawyerSpecialization.fromJson(s as Map<String, dynamic>)).toList();
    }

    return Lawyer(
      lawyerId: (json['lawyerId'] ?? '').toString(),
      name: (json['name'] ?? json['qualification'] ?? 'Advocate').toString(),
      email: json['email']?.toString(),
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      qualification: (json['qualification'] ?? '').toString(),
      experience: (json['experience'] ?? 0) as int,
      licenseNumber: (json['licenseNumber'] ?? '').toString(),
      profileDescription: (json['profileDescription'] ?? '').toString(),
      status: (json['status'] ?? 'Active').toString(),
      specializations: specs,
    );
  }

  String get primarySpecialization => specializations.isNotEmpty ? specializations.first.name : 'Legal Counsel';
}
