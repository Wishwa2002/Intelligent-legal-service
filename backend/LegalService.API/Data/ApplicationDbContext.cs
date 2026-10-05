using System;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Models.Entities;

namespace LegalService.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<LawyerWorkingSchedule> LawyerWorkingSchedules { get; set; }
    public DbSet<LawyerUnavailability> LawyerUnavailabilities { get; set; }
    public DbSet<Lawyer> Lawyers { get; set; }
    public DbSet<Specialization> Specializations { get; set; }
    public DbSet<LawyerSpecialization> LawyerSpecializations { get; set; }
    public DbSet<LegalService.API.Models.Entities.LegalService> LegalServices { get; set; }
    public DbSet<LawyerLegalService> LawyerLegalServices { get; set; }
    public DbSet<LawyerAvailability> LawyerAvailabilities { get; set; }
    public DbSet<AvailabilitySlot> AvailabilitySlots { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<AppointmentStatusHistory> AppointmentStatusHistories { get; set; }
    public DbSet<Clerk> Clerks { get; set; }
    public DbSet<DocumentationService> DocumentationServices { get; set; }
    public DbSet<DocumentationRequest> DocumentationRequests { get; set; }
    public DbSet<DocumentFile> DocumentFiles { get; set; }
    public DbSet<Career> Careers { get; set; }
    public DbSet<JobApplication> JobApplications { get; set; }
    public DbSet<ServiceRequest> ServiceRequests { get; set; }
    public DbSet<AgentWorkflow> AgentWorkflows { get; set; }
    public DbSet<AgentSessionState> AgentSessionStates { get; set; }
    public DbSet<AgentStep> AgentSteps { get; set; }
    public DbSet<ToolExecution> ToolExecutions { get; set; }
    public DbSet<ValidationResult> ValidationResults { get; set; }
    public DbSet<ApprovalDecision> ApprovalDecisions { get; set; }
    public DbSet<ExecutionSummary> ExecutionSummaries { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<LawyerRecommendationWorkflow> LawyerRecommendationWorkflows { get; set; }

    public DbSet<PracticeAreaWorkforceSetting> PracticeAreaWorkforceSettings { get; set; }
    public DbSet<WorkforceDemoState> WorkforceDemoStates { get; set; }

    public DbSet<HiringSuggestionWorkflow> HiringSuggestionWorkflows { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<AgentSessionState>(entity =>
        {
            entity.HasKey(x => new { x.Kind, x.SessionId });
            entity.Property(x => x.Kind).HasMaxLength(20);
            entity.Property(x => x.SessionId).HasMaxLength(64);
            entity.Property(x => x.StateJson).HasColumnType("jsonb");
        });
        modelBuilder.Entity<Lawyer>().Property(l => l.DefaultAppointmentDurationMinutes).HasDefaultValue(30);
        modelBuilder.Entity<Lawyer>().ToTable(t => t.HasCheckConstraint("CK_Lawyer_Duration", "\"DefaultAppointmentDurationMinutes\" BETWEEN 15 AND 240"));
        modelBuilder.Entity<LawyerWorkingSchedule>(e => {
            e.HasKey(s => s.Id);
            e.HasIndex(s => new { s.LawyerId, s.DayOfWeek }).IsUnique();
            e.HasOne(s => s.Lawyer).WithMany().HasForeignKey(s => s.LawyerId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => { t.HasCheckConstraint("CK_Schedule_Day", "\"DayOfWeek\" BETWEEN 0 AND 6"); t.HasCheckConstraint("CK_Schedule_Time", "NOT \"IsWorkingDay\" OR \"StartTime\" < \"EndTime\""); });
        });
        modelBuilder.Entity<LawyerUnavailability>(e => {
            e.HasKey(s => s.Id);
            e.HasIndex(s => new { s.LawyerId, s.StartDateTime, s.EndDateTime });
            e.HasOne(s => s.Lawyer).WithMany().HasForeignKey(s => s.LawyerId).OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.StartDateTime).HasColumnType("timestamp without time zone");
            e.Property(s => s.EndDateTime).HasColumnType("timestamp without time zone");
            e.Property(s => s.Reason).HasMaxLength(300);
            e.ToTable(t => t.HasCheckConstraint("CK_Unavailability_Time", "\"StartDateTime\" < \"EndDateTime\""));
        });
        modelBuilder.Entity<LawyerAvailability>().HasIndex(s => new { s.LawyerId, s.Date });
        modelBuilder.Entity<Appointment>().HasIndex(a => new { a.LawyerId, a.Status });


        modelBuilder.Entity<PracticeAreaWorkforceSetting>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.PracticeAreaId).IsUnique();
            entity.HasOne<Specialization>().WithMany().HasForeignKey(x => x.PracticeAreaId).OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(t => t.HasCheckConstraint("CK_WorkforceSettings_Ranges", "\"MinimumActiveLawyers\" BETWEEN 0 AND 100 AND \"TargetActiveLawyers\" BETWEEN \"MinimumActiveLawyers\" AND 200 AND \"MinimumFutureSlots\" BETWEEN 0 AND 1000 AND \"HighDemandThreshold\" BETWEEN 0 AND 10000 AND \"WatchCapacityRatio\" > 0 AND \"WatchCapacityRatio\" <= 1"));
        });
        modelBuilder.Entity<WorkforceDemoState>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.ArtifactsJson).HasColumnType("jsonb").IsConcurrencyToken();
        });

        modelBuilder.Entity<LawyerRecommendationWorkflow>(entity =>
        {
            entity.HasKey(x => x.WorkflowId);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Status).IsConcurrencyToken();
            entity.Property(x => x.ClientId).IsConcurrencyToken();
            entity.Property(x => x.ReviewStage).HasMaxLength(20).IsRequired().IsConcurrencyToken();
            entity.Property(x => x.SelectedLawyerId).IsConcurrencyToken();
            entity.Property(x => x.SelectedSlotId).IsConcurrencyToken();
            entity.Property(x => x.BookingDate).IsConcurrencyToken();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.SetNull);
            entity.Property(x => x.UserRequirement).HasMaxLength(4000).IsRequired();
            entity.Property(x => x.ParsedRequirementJson).HasColumnType("jsonb");
            entity.Property(x => x.RecommendationsJson).HasColumnType("jsonb");
            entity.Property(x => x.WarningsJson).HasColumnType("jsonb");
            entity.Property(x => x.AuditJson).HasColumnType("jsonb");
            entity.HasIndex(x => x.OwnerUserId);
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<HiringSuggestionWorkflow>(entity =>
        {
            entity.HasKey(x => x.WorkflowId);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired().IsConcurrencyToken();
            entity.Property(x => x.SystemSnapshotJson).HasColumnType("jsonb");
            entity.Property(x => x.AiDraftJson).HasColumnType("jsonb");
            entity.Property(x => x.ReviewedDraftJson).HasColumnType("jsonb");
            entity.Property(x => x.ApprovedTitle).HasMaxLength(200);
            entity.HasOne<Specialization>().WithMany().HasForeignKey(x => x.PracticeAreaId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<Career>().WithMany().HasForeignKey(x => x.CareerOpeningId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(x => new { x.OwnerUserId, x.Status });
            entity.HasIndex(x => new { x.OwnerUserId, x.PracticeAreaId }).IsUnique().HasFilter("\"Status\" = 'AWAITING_APPROVAL' AND \"PracticeAreaId\" IS NOT NULL");
        });
        modelBuilder.Entity<Career>().HasOne<Specialization>().WithMany()
            .HasForeignKey(x => x.PracticeAreaId).OnDelete(DeleteBehavior.SetNull);
        // Careers has no closed state. One linked existing opening is active recruitment.
        modelBuilder.Entity<Career>().HasIndex(x => x.PracticeAreaId).IsUnique().HasFilter("\"PracticeAreaId\" IS NOT NULL");

        // ==========================================
        // 1. IDENTITY AND AUTHORIZATION CONFIG
        // ==========================================

        // User entity mapped directly to Neon DB table "Users"
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.UserId);
            entity.Property(u => u.UserId).HasColumnName("UserId").ValueGeneratedOnAdd();
            entity.Property(u => u.Name).HasColumnName("Name").IsRequired();
            entity.Property(u => u.Email).HasColumnName("Email").IsRequired();
            entity.Property(u => u.Role).HasColumnName("Role").IsRequired();
            entity.Property(u => u.PasswordHash).HasColumnName("PasswordHash");
            entity.Property(u => u.CreatedAt).HasColumnName("CreatedAt").IsRequired();
            entity.Property(u => u.UpdatedAt).HasColumnName("UpdatedAt").IsRequired();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // UserRole Composite PK
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<UserRole>()
            .Ignore(ur => ur.User);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Role>()
            .HasIndex(r => r.Name)
            .IsUnique();


        // ==========================================
        // 2. LAWYER MANAGEMENT CONFIG
        // ==========================================

        modelBuilder.Entity<Lawyer>()
            .HasKey(l => l.LawyerId);

        modelBuilder.Entity<Lawyer>()
            .Ignore(l => l.User);

        modelBuilder.Entity<Lawyer>()
            .HasIndex(l => l.LicenseNumber)
            .IsUnique();

        modelBuilder.Entity<Lawyer>()
            .HasIndex(l => l.Status);

        modelBuilder.Entity<Specialization>()
            .HasIndex(s => s.Name)
            .IsUnique();

        // LawyerSpecialization Composite PK (Many-to-Many Bridge)
        modelBuilder.Entity<LawyerSpecialization>()
            .HasKey(ls => new { ls.LawyerId, ls.SpecializationId });

        modelBuilder.Entity<LawyerSpecialization>()
            .HasOne(ls => ls.Lawyer)
            .WithMany(l => l.LawyerSpecializations)
            .HasForeignKey(ls => ls.LawyerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LawyerSpecialization>()
            .HasOne(ls => ls.Specialization)
            .WithMany(s => s.LawyerSpecializations)
            .HasForeignKey(ls => ls.SpecializationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LawyerSpecialization>()
            .HasIndex(ls => ls.SpecializationId);


        // ==========================================
        // 3. LEGAL SERVICES CONFIG
        // ==========================================

        // LawyerLegalService Composite PK (Many-to-Many Bridge)
        modelBuilder.Entity<LawyerLegalService>()
            .HasKey(lls => new { lls.LawyerId, lls.LegalServiceId });

        modelBuilder.Entity<LawyerLegalService>()
            .HasOne(lls => lls.Lawyer)
            .WithMany(l => l.LawyerLegalServices)
            .HasForeignKey(lls => lls.LawyerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LawyerLegalService>()
            .HasOne(lls => lls.LegalService)
            .WithMany(ls => ls.LawyerLegalServices)
            .HasForeignKey(lls => lls.LegalServiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LawyerLegalService>()
            .HasIndex(lls => lls.LegalServiceId);


        // ==========================================
        // 4. LAWYER AVAILABILITY AND BOOKING CONFIG
        // ==========================================

        modelBuilder.Entity<LawyerAvailability>()
            .HasKey(la => la.AvailabilityId);

        modelBuilder.Entity<LawyerAvailability>()
            .HasOne(la => la.Lawyer)
            .WithMany(l => l.LawyerAvailabilities)
            .HasForeignKey(la => la.LawyerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LawyerAvailability>()
            .HasIndex(la => new { la.LawyerId, la.Date });

        modelBuilder.Entity<AvailabilitySlot>()
            .HasKey(s => s.SlotId);

        modelBuilder.Entity<AvailabilitySlot>()
            .HasOne(s => s.LawyerAvailability)
            .WithMany(la => la.AvailabilitySlots)
            .HasForeignKey(s => s.AvailabilityId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AvailabilitySlot>()
            .HasIndex(s => s.AvailabilityId);

        modelBuilder.Entity<Appointment>()
            .HasKey(a => a.AppointmentId);

        modelBuilder.Entity<Appointment>()
            .Ignore(a => a.Customer);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Lawyer)
            .WithMany(l => l.Appointments)
            .HasForeignKey(a => a.LawyerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.AvailabilitySlot)
            .WithOne(s => s.Appointment)
            .HasForeignKey<Appointment>(a => a.SlotId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => a.CustomerId);

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => a.LawyerId);

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => a.SlotId)
            .IsUnique();

        modelBuilder.Entity<AppointmentStatusHistory>()
            .HasKey(h => h.HistoryId);

        modelBuilder.Entity<AppointmentStatusHistory>()
            .HasOne(h => h.Appointment)
            .WithMany(a => a.AppointmentStatusHistories)
            .HasForeignKey(h => h.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);


        // ==========================================
        // 5. CLERK AND DOCUMENTATION CONFIG
        // ==========================================

        // 1:0..1 relationship between User and Clerk — REMOVED (DB uses int PK, no FK to Users)
        modelBuilder.Entity<Clerk>()
            .HasKey(c => c.ClerkId);

        modelBuilder.Entity<DocumentationService>()
            .HasKey(ds => ds.ServiceId);

        modelBuilder.Entity<DocumentationService>()
            .HasIndex(ds => ds.Name)
            .IsUnique();

        modelBuilder.Entity<DocumentationService>()
            .Property(ds => ds.IsActive)
            .HasDefaultValue(true);

        modelBuilder.Entity<DocumentationService>()
            .HasIndex(ds => ds.IsActive);

        modelBuilder.Entity<DocumentationRequest>()
            .HasKey(dr => dr.RequestId);

        modelBuilder.Entity<DocumentationRequest>()
            .Property(dr => dr.RequestId)
            .ValueGeneratedOnAdd();

        // Map ClerkId FK column name to match DB column "ClerkId" (not "AssignedClerkId")
        modelBuilder.Entity<DocumentationRequest>()
            .Property(dr => dr.AssignedClerkId)
            .HasColumnName("ClerkId");

        modelBuilder.Entity<DocumentationRequest>()
            .HasOne(dr => dr.DocumentationService)
            .WithMany(ds => ds.DocumentationRequests)
            .HasForeignKey(dr => dr.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DocumentationRequest>()
            .HasOne(dr => dr.AssignedClerk)
            .WithMany(c => c.DocumentationRequests)
            .HasForeignKey(dr => dr.AssignedClerkId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DocumentationRequest>()
            .HasIndex(dr => dr.CustomerId);

        modelBuilder.Entity<DocumentationRequest>()
            .HasIndex(dr => dr.AssignedClerkId);

        modelBuilder.Entity<DocumentFile>()
            .HasKey(df => df.FileId);

        modelBuilder.Entity<DocumentFile>()
            .HasOne(df => df.DocumentationRequest)
            .WithMany(dr => dr.DocumentFiles)
            .HasForeignKey(df => df.RequestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DocumentFile>()
            .HasIndex(df => df.RequestId);

        modelBuilder.Entity<DocumentFile>()
            .Property(df => df.DocumentStatus)
            .HasDefaultValue("Received");

        modelBuilder.Entity<DocumentFile>()
            .HasIndex(df => df.DocumentStatus);

        // ==========================================
        // 6. CAREER MANAGEMENT CONFIG
        // ==========================================

        modelBuilder.Entity<Career>()
            .HasKey(c => c.CareerId);

        modelBuilder.Entity<JobApplication>()
            .HasKey(ja => ja.ApplicationId);

        modelBuilder.Entity<JobApplication>()
            .HasOne(ja => ja.Career)
            .WithMany(c => c.JobApplications)
            .HasForeignKey(ja => ja.CareerId)
            .OnDelete(DeleteBehavior.Restrict);


        // ==========================================
        // 7. CUSTOMER SERVICE REQUEST CONFIG
        // ==========================================

        modelBuilder.Entity<ServiceRequest>()
            .HasKey(sr => sr.ServiceRequestId);

        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.ServiceRequestId)
            .ValueGeneratedOnAdd();

        // Store Status as its string name (e.g. "Submitted") for readability in DB
        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.Title)
            .HasMaxLength(200)
            .IsRequired();

        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.Description)
            .HasMaxLength(2000)
            .IsRequired();

        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.RequestType)
            .HasMaxLength(100)
            .IsRequired();

        modelBuilder.Entity<ServiceRequest>()
            .Property(sr => sr.Priority)
            .HasMaxLength(20);

        // Customer relationship: ServiceRequest.CustomerId → User.UserId
        // Ignore navigation to avoid FK conflict with User table (int PK)
        modelBuilder.Entity<ServiceRequest>()
            .Ignore(sr => sr.Customer);

        modelBuilder.Entity<ServiceRequest>()
            .HasIndex(sr => sr.CustomerId);

        modelBuilder.Entity<ServiceRequest>()
            .HasIndex(sr => sr.Status);

        modelBuilder.Entity<ServiceRequest>()
            .HasIndex(sr => sr.RequestType);

        modelBuilder.Entity<ServiceRequest>()
            .HasIndex(sr => sr.CreatedAt);


        // ==========================================
        // 8. AGENTIC AI WORKFLOW CONFIG
        // ==========================================

        modelBuilder.Entity<AgentWorkflow>()
            .HasKey(aw => aw.WorkflowId);

        modelBuilder.Entity<AgentWorkflow>()
            .HasOne(aw => aw.ServiceRequest)
            .WithOne(sr => sr.AgentWorkflow)
            .HasForeignKey<AgentWorkflow>(aw => aw.ServiceRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AgentWorkflow>()
            .HasIndex(aw => aw.ServiceRequestId)
            .IsUnique();

        modelBuilder.Entity<AgentWorkflow>()
            .HasIndex(aw => aw.Status);

        modelBuilder.Entity<AgentStep>()
            .HasKey(step => step.StepId);

        modelBuilder.Entity<AgentStep>()
            .HasOne(step => step.AgentWorkflow)
            .WithMany(aw => aw.AgentSteps)
            .HasForeignKey(step => step.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AgentStep>()
            .Property(step => step.InputPayload)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AgentStep>()
            .Property(step => step.OutputPayload)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AgentStep>()
            .HasIndex(step => step.WorkflowId);

        modelBuilder.Entity<ToolExecution>()
            .HasKey(te => te.ToolId);

        modelBuilder.Entity<ToolExecution>()
            .HasOne(te => te.AgentStep)
            .WithMany(step => step.ToolExecutions)
            .HasForeignKey(te => te.StepId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ToolExecution>()
            .Property(te => te.InputData)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ToolExecution>()
            .Property(te => te.OutputData)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ValidationResult>()
            .HasKey(vr => vr.ValidationId);

        modelBuilder.Entity<ValidationResult>()
            .HasOne(vr => vr.AgentWorkflow)
            .WithMany(aw => aw.ValidationResults)
            .HasForeignKey(vr => vr.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ValidationResult>()
            .Property(vr => vr.RulesChecked)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ValidationResult>()
            .Property(vr => vr.Errors)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ApprovalDecision>()
            .HasKey(ad => ad.DecisionId);

        modelBuilder.Entity<ApprovalDecision>()
            .HasOne(ad => ad.AgentWorkflow)
            .WithMany(aw => aw.ApprovalDecisions)
            .HasForeignKey(ad => ad.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ApprovalDecision>()
            .Ignore(ad => ad.Approver);

        modelBuilder.Entity<ExecutionSummary>()
            .HasKey(es => es.SummaryId);

        modelBuilder.Entity<ExecutionSummary>()
            .HasOne(es => es.AgentWorkflow)
            .WithOne(aw => aw.ExecutionSummary)
            .HasForeignKey<ExecutionSummary>(es => es.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExecutionSummary>()
            .HasIndex(es => es.WorkflowId)
            .IsUnique();


        // ==========================================
        // 9. AUDIT CONFIG
        // ==========================================

        modelBuilder.Entity<AuditLog>()
            .HasKey(al => al.AuditLogId);

        modelBuilder.Entity<AuditLog>()
            .Ignore(al => al.User);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => al.UserId);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => al.Timestamp);


        // ==========================================
        // 13. SEED DATA
        // ==========================================

        // Define Seed Role Guids (aligned with the database)
        var customerRoleId = new Guid("c3a0767c-9b7e-40fb-881c-cb8e2c07df74");
        var lawyerRoleId = new Guid("7f7b3df6-6eb3-4a6c-b7ee-d57be45dc98a");
        var clerkRoleId = new Guid("e81f5cb1-ea60-449e-b9ef-d4924a48045d");
        var adminRoleId = new Guid("15f92271-e0e6-42d8-bf12-cb4b71db3f05");

        modelBuilder.Entity<Role>().HasData(
            new Role { Id = customerRoleId, Name = "Customer" },
            new Role { Id = lawyerRoleId, Name = "Lawyer" },
            new Role { Id = clerkRoleId, Name = "Clerk" },
            new Role { Id = adminRoleId, Name = "Admin" }
        );

        modelBuilder.Entity<Specialization>().HasData(
            new Specialization { SpecializationId = 1, Name = "Criminal Law", Description = "Defense and prosecutorial assistance in criminal litigation." },
            new Specialization { SpecializationId = 2, Name = "Family Law", Description = "Divorce, child custody, and domestic relationships." },
            new Specialization { SpecializationId = 3, Name = "Corporate Law", Description = "Business registration, compliance, and contract drafting." },
            new Specialization { SpecializationId = 4, Name = "Property Law", Description = "Real estate transactions, leases, and title disputes." }
        );

        // Match the existing migration snapshot so model checks do not see new seed data on every build.
        var legalServiceSeedCreatedAt = new DateTime(2026, 10, 4, 15, 11, 10, 985, DateTimeKind.Utc).AddTicks(3860);
        var documentationSeedCreatedAt = new DateTime(2026, 10, 4, 15, 11, 10, 985, DateTimeKind.Utc).AddTicks(3880);
        modelBuilder.Entity<LegalService.API.Models.Entities.LegalService>().HasData(
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 1, ServiceName = "Criminal Defense Consulting", Description = "Representation and case review for criminal defense cases.", Category = "Criminal Law", CreatedAt = legalServiceSeedCreatedAt },
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 2, ServiceName = "Divorce & Custody Filing", Description = "Preparation and filing for divorce and child custody.", Category = "Family Law", CreatedAt = legalServiceSeedCreatedAt },
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 3, ServiceName = "Corporate Registration & Compliance", Description = "Incorporation filings and compliance setup.", Category = "Corporate Law", CreatedAt = legalServiceSeedCreatedAt }
        );

        modelBuilder.Entity<DocumentationService>().HasData(
            new DocumentationService
            {
                ServiceId = 1,
                Name = "Contract Review & Amendment",
                Description = "Reviewing lease/sales agreements and drafting amendments.",
                IsActive = true,
                CreatedAt = documentationSeedCreatedAt,
                RequiredDocuments = "[\"Original Contract\",\"Amendment Request Letter\",\"NIC Copy\"]"
            },
            new DocumentationService
            {
                ServiceId = 2,
                Name = "Affidavit & Notary Services",
                Description = "Drafting affidavits and arranging official notarization.",
                IsActive = true,
                CreatedAt = documentationSeedCreatedAt,
                RequiredDocuments = "[\"NIC\",\"Completed Affidavit Draft\",\"Witness Details\"]"
            },
            new DocumentationService
            {
                ServiceId = 3,
                Name = "Power of Attorney Drafting",
                Description = "Drafting General or Special Power of Attorney documents.",
                IsActive = true,
                CreatedAt = documentationSeedCreatedAt,
                RequiredDocuments = "[\"NIC of Grantor\",\"NIC of Grantee\",\"Scope of Authority Document\"]"
            }
        );
    }
}
