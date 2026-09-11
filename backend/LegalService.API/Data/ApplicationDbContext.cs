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
    public DbSet<AgentStep> AgentSteps { get; set; }
    public DbSet<ToolExecution> ToolExecutions { get; set; }
    public DbSet<ValidationResult> ValidationResults { get; set; }
    public DbSet<ApprovalDecision> ApprovalDecisions { get; set; }
    public DbSet<ExecutionSummary> ExecutionSummaries { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ==========================================
        // 1. IDENTITY AND AUTHORIZATION CONFIG
        // ==========================================

        // UserRole Composite PK
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Prevent EF Core from creating shadow 'UserId' foreign key on DocumentationRequests and Clerks
        modelBuilder.Entity<User>()
            .Ignore(u => u.DocumentationRequests);

        modelBuilder.Entity<User>()
            .Ignore(u => u.Clerk);

        modelBuilder.Entity<Role>()
            .HasIndex(r => r.Name)
            .IsUnique();


        // ==========================================
        // 2. LAWYER MANAGEMENT CONFIG
        // ==========================================

        // 1:0..1 relationship between User and Lawyer
        modelBuilder.Entity<Lawyer>()
            .HasKey(l => l.LawyerId);

        modelBuilder.Entity<Lawyer>()
            .HasOne(l => l.User)
            .WithOne(u => u.Lawyer)
            .HasForeignKey<Lawyer>(l => l.LawyerId)
            .OnDelete(DeleteBehavior.Cascade);

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
            .HasOne(a => a.Customer)
            .WithMany(u => u.Appointments)
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

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
            .HasOne(sr => sr.Customer)
            .WithMany(u => u.ServiceRequests)
            .HasForeignKey(sr => sr.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ServiceRequest>()
            .HasIndex(sr => sr.CustomerId);


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
            .HasOne(ad => ad.Approver)
            .WithMany(u => u.ApprovalDecisions)
            .HasForeignKey(ad => ad.ApproverId)
            .OnDelete(DeleteBehavior.Restrict);

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
            .HasOne(al => al.User)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.SetNull);

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

        modelBuilder.Entity<LegalService.API.Models.Entities.LegalService>().HasData(
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 1, ServiceName = "Criminal Defense Consulting", Description = "Representation and case review for criminal defense cases.", Category = "Criminal Law" },
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 2, ServiceName = "Divorce & Custody Filing", Description = "Preparation and filing for divorce and child custody.", Category = "Family Law" },
            new LegalService.API.Models.Entities.LegalService { LegalServiceId = 3, ServiceName = "Corporate Registration & Compliance", Description = "Incorporation filings and compliance setup.", Category = "Corporate Law" }
        );

        modelBuilder.Entity<DocumentationService>().HasData(
            new DocumentationService
            {
                ServiceId = 1,
                Name = "Contract Review & Amendment",
                Description = "Reviewing lease/sales agreements and drafting amendments.",
                IsActive = true,
                RequiredDocuments = "[\"Original Contract\",\"Amendment Request Letter\",\"NIC Copy\"]"
            },
            new DocumentationService
            {
                ServiceId = 2,
                Name = "Affidavit & Notary Services",
                Description = "Drafting affidavits and arranging official notarization.",
                IsActive = true,
                RequiredDocuments = "[\"NIC\",\"Completed Affidavit Draft\",\"Witness Details\"]"
            },
            new DocumentationService
            {
                ServiceId = 3,
                Name = "Power of Attorney Drafting",
                Description = "Drafting General or Special Power of Attorney documents.",
                IsActive = true,
                RequiredDocuments = "[\"NIC of Grantor\",\"NIC of Grantee\",\"Scope of Authority Document\"]"
            }
        );
    }
}