import 'package:flutter/material.dart';
import '../models.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';
import 'appointment_card.dart';
import 'lawyer_appointment_detail_screen.dart';

class LawyerAppointmentsScreen extends StatefulWidget {
  final String initialFilter;
  final VoidCallback onChanged;
  const LawyerAppointmentsScreen({
    super.key,
    this.initialFilter = 'upcoming',
    required this.onChanged,
  });
  @override
  State<LawyerAppointmentsScreen> createState() =>
      _LawyerAppointmentsScreenState();
}

class _LawyerAppointmentsScreenState extends State<LawyerAppointmentsScreen> {
  late String filter;
  @override
  void initState() {
    super.initState();
    filter = widget.initialFilter;
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: LawyerDesign.pagePadding,
        child: Row(
          children: [
            for (final f in [
              'today',
              'upcoming',
              'pending',
              'completed',
              'cancelled',
              'all',
            ])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text('${f[0].toUpperCase()}${f.substring(1)}'),
                  selected: filter == f,
                  showCheckmark: false,
                  onSelected: (_) => setState(() => filter = f),
                ),
              ),
          ],
        ),
      ),
      Expanded(
        child: ServerPanel<List<LawyerAppointment>>(
          key: ValueKey(filter),
          load: () => LawyerApi.appointments(filter),
          content: (data, reload) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: LawyerDesign.pagePadding,
            children: [
              if (data.isEmpty)
                emptyState(
                  filter == 'today'
                      ? 'No appointments today'
                      : filter == 'completed'
                      ? 'No completed appointments yet'
                      : filter == 'all'
                      ? 'No appointments yet'
                      : 'No $filter appointments',
                  filter == 'completed'
                      ? 'Completed consultations will appear here.'
                      : 'New appointments assigned to you will appear here.',
                ),
              for (final a in data)
                AppointmentCard(
                  appointment: a,
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LawyerAppointmentDetailScreen(id: a.id),
                      ),
                    );
                    reload();
                  },
                ),
            ],
          ),
        ),
      ),
    ],
  );
}
