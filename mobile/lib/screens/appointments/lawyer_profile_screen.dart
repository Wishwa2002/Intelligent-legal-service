import 'package:flutter/material.dart';
import '../../models/lawyer.dart';
import '../../services/lawyer_service.dart';
import 'book_appointment_screen.dart';
import 'specialization_details_screen.dart';

class LawyerProfileScreen extends StatefulWidget {
  final String lawyerId;
  const LawyerProfileScreen({super.key, required this.lawyerId});
  @override
  State<LawyerProfileScreen> createState() => _LawyerProfileScreenState();
}

class _LawyerProfileScreenState extends State<LawyerProfileScreen> {
  late Future<Lawyer> _profile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _profile = LawyerService.getLawyerById(widget.lawyerId);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Lawyer profile')),
    body: FutureBuilder<Lawyer>(future: _profile, builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Unable to load this lawyer profile.'),
          TextButton(onPressed: () => setState(_load), child: const Text('Retry')),
        ]));
      }
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final lawyer = snapshot.data!;
      return ListView(padding: const EdgeInsets.all(20), children: [
        Text(lawyer.name, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(lawyer.qualification),
        Text('${lawyer.experience} years of experience'),
        Text('License: ${lawyer.licenseNumber}'),
        Text('Status: ${lawyer.status}'),
        if (lawyer.email?.isNotEmpty ?? false) Text(lawyer.email!),
        if (lawyer.phoneNumber.isNotEmpty) Text(lawyer.phoneNumber),
        const SizedBox(height: 16),
        Text('Professional description', style: Theme.of(context).textTheme.titleMedium),
        Text(lawyer.profileDescription.isEmpty ? 'No professional description recorded.' : lawyer.profileDescription),
        const SizedBox(height: 16),
        Text('Practice Area', style: Theme.of(context).textTheme.titleMedium),
        for (final item in lawyer.specializations) ListTile(contentPadding: EdgeInsets.zero,
          title: Text(item.name), subtitle: Text(item.description.isEmpty ? 'No description recorded.' : item.description),
          trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute(
            builder: (_) => SpecializationDetailsScreen(specialization: item)))),
        Text('Legal services', style: Theme.of(context).textTheme.titleMedium),
        if (lawyer.legalServices.isEmpty) const Text('No eligible Legal Services recorded for this Practice Area.'),
        for (final service in lawyer.legalServices) ListTile(contentPadding: EdgeInsets.zero,
          title: Text(service.serviceName), subtitle: Text(service.description)),
        const SizedBox(height: 16),
        Text('Recorded availability', style: Theme.of(context).textTheme.titleMedium),
        _RecordedAvailability(lawyerId: widget.lawyerId),
        const SizedBox(height: 20),
        ElevatedButton.icon(icon: const Icon(Icons.calendar_month),
          label: Text(lawyer.status == 'Active' ? 'Book Consultation' : 'Currently unavailable'),
          onPressed: lawyer.status != 'Active' ? null : () => Navigator.push(context, MaterialPageRoute(
            builder: (_) => BookAppointmentScreen(lawyer: lawyer, initialCategory: lawyer.primarySpecialization)))),
      ]);
    }),
  );
}

class _RecordedAvailability extends StatefulWidget {
  final String lawyerId;
  const _RecordedAvailability({required this.lawyerId});
  @override
  State<_RecordedAvailability> createState() => _RecordedAvailabilityState();
}

class _RecordedAvailabilityState extends State<_RecordedAvailability> {
  late Future<List<AvailabilitySlot>> _availability;
  @override
  void initState() {
    super.initState();
    _availability = LawyerService.getRecordedAvailability(widget.lawyerId);
  }
  @override
  Widget build(BuildContext context) => FutureBuilder<List<AvailabilitySlot>>(
    future: _availability, builder: (context, slots) {
      if (slots.hasError) {
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Unable to load availability.'),
          TextButton(onPressed: () => setState(() => _availability = LawyerService.getRecordedAvailability(widget.lawyerId)),
            child: const Text('Retry availability')),
        ]);
      }
      if (!slots.hasData) return const LinearProgressIndicator();
      if (slots.data!.isEmpty) return const Text('No upcoming unbooked slots recorded.');
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final slot in slots.data!) Text('${slot.date} · ${slot.formattedTime}'),
        const Text('Availability is checked again when booking.'),
      ]);
    });
}
