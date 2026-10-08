import 'package:flutter/material.dart';
import '../models.dart';
import '../widgets.dart';
import '../design.dart';

class AppointmentCard extends StatelessWidget {
  final LawyerAppointment appointment;
  final VoidCallback onTap;
  final bool upNext;
  const AppointmentCard({
    super.key,
    required this.appointment,
    required this.onTap,
    this.upNext = false,
  });
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    child: Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LawyerDesign.radius),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 12,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    upNext
                        ? '${relativeAppointmentDate(appointment.date)} · ${shortTime(appointment.start)}'
                        : '${shortTime(appointment.start)} – ${shortTime(appointment.end)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  StatusChip(appointment.status),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                appointment.client,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (appointment.practiceArea.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  appointment.practiceArea,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              if (appointment.legalService.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  appointment.legalService,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      appointmentDate(appointment.date),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            'View Appointment',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: LawyerDesign.navy,
                            ),
                          ),
                        ),
                        Icon(
                          Icons.chevron_right,
                          size: 20,
                          color: LawyerDesign.muted,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
