import 'package:flutter/material.dart';
import '../../models/lawyer.dart';

class SpecializationDetailsScreen extends StatelessWidget {
  final LawyerSpecialization specialization;
  const SpecializationDetailsScreen({super.key, required this.specialization});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Practice Area details')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      Text(specialization.name, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 16),
      Text(specialization.description.trim().isEmpty
        ? 'No description has been recorded for this Practice Area.' : specialization.description),
    ]),
  );
}
