using Bogus;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Infrastructure.Data;

public static class BulkDataSeeder
{
    private const int TargetStudents = 2000;

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        if (await db.Students.CountAsync() >= TargetStudents)
        {
            logger.LogInformation("Bulk seed skipped: {Count} students already exist.", await db.Students.CountAsync());
            return;
        }

        logger.LogInformation("Starting bulk seed for {Count} students...", TargetStudents);
        var random = new Random(42);
        var faker = new Faker("en");

        await EnsureRolesAsync(roleManager);
        var admin = await userManager.FindByNameAsync("admin");
        var adminId = admin?.Id ?? Guid.Empty;

        var programs = await EnsureProgramsAsync(db);
        var semesters = await EnsureSemestersAsync(db, programs);
        var courses = await EnsureCoursesAsync(db);
        var lecturers = await EnsureLecturersAsync(userManager, random);
        var offerings = await EnsureOfferingsAsync(db, courses, semesters, lecturers, random);
        var components = await EnsureAssessmentComponentsAsync(db, offerings, random);
        await EnsureClinicalFacilitiesAsync(db);
        await EnsureSchoolEventsAsync(db, adminId);
        await EnsureFeeStructuresAsync(db, programs);

        var gradeScales = await db.GradeScales.ToListAsync();
        var facilities = await db.ClinicalFacilities.ToListAsync();
        var supervisors = await db.ClinicalSupervisors.ToListAsync();
        var financeUser = await EnsureStaffUserAsync(userManager, "finance", "finance@nursingschool.local", RoleNames.FinanceOfficer, "Sarah", "Nabukeera");
        var registrarUser = await EnsureStaffUserAsync(userManager, "registrar", "registrar@nursingschool.local", RoleNames.Registrar, "Grace", "Nambooze");

        var existing = await db.Students.CountAsync();
        var toCreate = TargetStudents - existing;
        var batchSize = 100;

        for (var batch = 0; batch < toCreate; batch += batchSize)
        {
            var students = new List<Student>();
            var guardians = new List<Guardian>();
            var enrollments = new List<Enrollment>();
            var marks = new List<Mark>();
            var invoices = new List<Invoice>();
            var invoiceItems = new List<InvoiceItem>();
            var payments = new List<Payment>();
            var placements = new List<ClinicalPlacement>();

            for (var i = 0; i < batchSize && batch + i < toCreate; i++)
            {
                var idx = existing + batch + i + 1;
                var isFemale = random.Next(2) == 0;
                var firstName = isFemale
                    ? UgandanNames.FemaleFirst[random.Next(UgandanNames.FemaleFirst.Length)]
                    : UgandanNames.MaleFirst[random.Next(UgandanNames.MaleFirst.Length)];
                var lastName = UgandanNames.Surnames[random.Next(UgandanNames.Surnames.Length)];
                var district = UgandanNames.Districts[random.Next(UgandanNames.Districts.Length)];
                var program = programs[random.Next(programs.Count)];
                var yearOffset = random.Next(0, 4);
                var admissionYear = DateTime.UtcNow.Year - yearOffset;

                var student = new Student
                {
                    StudentNo = $"UG{admissionYear}{idx:D5}",
                    FirstName = firstName,
                    LastName = lastName,
                    Gender = isFemale ? "Female" : "Male",
                    DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-(20 + random.Next(8)))),
                    Phone = $"+2567{random.Next(10000000, 99999999)}",
                    Email = $"{firstName.ToLower()}.{lastName.ToLower()}{idx}@student.nursingschool.ug",
                    Address = $"{district}, Uganda",
                    District = district,
                    ProgramId = program.Id,
                    AdmissionDate = new DateOnly(admissionYear, random.Next(1, 3), random.Next(1, 28)),
                    Status = random.Next(20) == 0 ? StudentStatuses.Suspended : StudentStatuses.Active
                };
                students.Add(student);

                for (var g = 0; g < (random.Next(3) == 0 ? 2 : 1); g++)
                {
                    guardians.Add(new Guardian
                    {
                        Student = student,
                        FullName = $"{UgandanNames.MaleFirst[random.Next(UgandanNames.MaleFirst.Length)]} {lastName}",
                        Relationship = UgandanNames.GuardianRelations[random.Next(UgandanNames.GuardianRelations.Length)],
                        Phone = $"+2567{random.Next(10000000, 99999999)}",
                        Email = $"parent.{lastName.ToLower()}{idx}{g}@gmail.com",
                        Address = $"{district}, Uganda",
                        HasPortalAccess = random.Next(5) == 0
                    });
                }

                var studentOfferings = offerings.OrderBy(_ => random.Next()).Take(random.Next(3, 6)).ToList();
                foreach (var off in studentOfferings)
                {
                    enrollments.Add(new Enrollment
                    {
                        Student = student,
                        CourseOfferingId = off.Id,
                        EnrollmentDate = student.AdmissionDate,
                        Status = EnrollmentStatuses.Enrolled
                    });

                    foreach (var comp in components.Where(c => c.CourseOfferingId == off.Id))
                    {
                        var max = (int)comp.MaxScore;
                        marks.Add(new Mark
                        {
                            Student = student,
                            AssessmentComponentId = comp.Id,
                            Score = random.Next(Math.Max(1, max / 2), max + 1),
                            EnteredBy = off.LecturerId,
                            EnteredAt = DateTime.UtcNow.AddDays(-random.Next(1, 60))
                        });
                    }
                }

                var feeTotal = 6500000m + random.Next(0, 5) * 500000m;
                var invoice = new Invoice
                {
                    Student = student,
                    InvoiceNo = $"INV{admissionYear}{idx:D6}",
                    AcademicYear = admissionYear.ToString(),
                    TotalAmount = feeTotal,
                    Status = InvoiceStatuses.Unpaid,
                    IssuedAt = DateTime.UtcNow.AddMonths(-random.Next(1, 12)),
                    DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(random.Next(-30, 90))),
                    CreatedBy = adminId
                };
                invoices.Add(invoice);
                invoiceItems.Add(new InvoiceItem { Invoice = invoice, Description = "Tuition Fee", Amount = feeTotal * 0.7m });
                invoiceItems.Add(new InvoiceItem { Invoice = invoice, Description = "Clinical & Lab Fees", Amount = feeTotal * 0.3m });

                var payScenario = random.Next(100);
                if (payScenario < 40)
                {
                    payments.Add(new Payment
                    {
                        Invoice = invoice,
                        ReceiptNo = $"RCP{admissionYear}{idx:D6}",
                        Amount = feeTotal,
                        PaymentMethod = PaymentMethods.All[random.Next(PaymentMethods.All.Length)],
                        PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-random.Next(1, 90))),
                        RecordedBy = financeUser.Id,
                        CreatedBy = financeUser.Id
                    });
                    invoice.Status = InvoiceStatuses.Paid;
                }
                else if (payScenario < 75)
                {
                    var partial = feeTotal * (decimal)(random.Next(20, 80) / 100.0);
                    payments.Add(new Payment
                    {
                        Invoice = invoice,
                        ReceiptNo = $"RCP{admissionYear}{idx:D6}",
                        Amount = partial,
                        PaymentMethod = PaymentMethods.All[random.Next(PaymentMethods.All.Length)],
                        PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-random.Next(1, 60))),
                        RecordedBy = financeUser.Id,
                        CreatedBy = financeUser.Id
                    });
                    invoice.Status = InvoiceStatuses.Partial;
                }
                else if (invoice.DueDate < DateOnly.FromDateTime(DateTime.UtcNow))
                {
                    invoice.Status = InvoiceStatuses.Overdue;
                }

                if (facilities.Count > 0 && random.Next(3) == 0)
                {
                    var fac = facilities[random.Next(facilities.Count)];
                    var sup = supervisors.FirstOrDefault(s => s.FacilityId == fac.Id);
                    placements.Add(new ClinicalPlacement
                    {
                        Student = student,
                        FacilityId = fac.Id,
                        SupervisorId = sup?.Id,
                        StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-random.Next(10, 60))),
                        EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(random.Next(30, 120))),
                        Department = random.Next(2) == 0 ? "Medical Ward" : "Maternity",
                        Status = PlacementStatuses.Active
                    });
                }
            }

            db.Students.AddRange(students);
            db.Guardians.AddRange(guardians);
            db.Enrollments.AddRange(enrollments);
            db.Marks.AddRange(marks);
            db.Invoices.AddRange(invoices);
            db.InvoiceItems.AddRange(invoiceItems);
            db.Payments.AddRange(payments);
            db.ClinicalPlacements.AddRange(placements);
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded batch {Batch}: {Count} students", batch / batchSize + 1, students.Count);
        }

        var notifier = scope.ServiceProvider.GetService<INotificationService>();
        if (notifier != null)
            await notifier.BroadcastToStaffAsync("Data seed complete", $"{TargetStudents} students loaded with marks, fees, and placements.", "System");

        logger.LogInformation("Bulk seed completed.");
    }

    public static async Task EnsureStudentPortalAccountsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        const int targetAccounts = 2000;
        var unlinked = await db.Students
            .Where(s => s.UserId == null)
            .OrderBy(s => s.StudentNo)
            .Take(targetAccounts)
            .ToListAsync();

        if (unlinked.Count == 0) return;

        var linked = 0;
        for (var i = 0; i < unlinked.Count; i++)
        {
            var student = unlinked[i];
            var username = $"student{i + 1}";
            var user = await userManager.FindByNameAsync(username);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = username,
                    Email = $"{username}@student.nursingschool.ug",
                    EmailConfirmed = true,
                    FirstName = student.FirstName,
                    LastName = student.LastName,
                    IsActive = true,
                };
                var createResult = await userManager.CreateAsync(user, "Student@123");
                if (!createResult.Succeeded)
                {
                    logger.LogWarning("Could not create portal account {UserName}.", username);
                    continue;
                }

                await userManager.AddToRoleAsync(user, RoleNames.Student);
            }

            student.UserId = user.Id;
            linked++;

            if (linked % 100 == 0)
                await db.SaveChangesAsync();
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Linked {Count} student portal accounts (student1…student{Last}).", linked, linked);
    }

    private static async Task EnsureRolesAsync(RoleManager<IdentityRole<Guid>> roleManager)
    {
        foreach (var role in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
    }

    private static async Task<List<Program>> EnsureProgramsAsync(AppDbContext db)
    {
        if (await db.Programs.AnyAsync()) return await db.Programs.ToListAsync();
        var programs = new List<Program>
        {
            new() { Code = "BSN", Name = "Bachelor of Science in Nursing", DurationYears = 4 },
            new() { Code = "DN", Name = "Diploma in Nursing", DurationYears = 3 },
            new() { Code = "BMW", Name = "Bachelor of Midwifery", DurationYears = 4 },
            new() { Code = "PCN", Name = "Post-Basic Certificate in Nursing", DurationYears = 1 }
        };
        db.Programs.AddRange(programs);
        await db.SaveChangesAsync();
        return programs;
    }

    private static async Task<List<Semester>> EnsureSemestersAsync(AppDbContext db, List<Program> programs)
    {
        if (await db.Semesters.AnyAsync()) return await db.Semesters.ToListAsync();
        var semesters = new List<Semester>();
        foreach (var p in programs)
        {
            for (var y = 1; y <= p.DurationYears; y++)
            {
                semesters.Add(new Semester { ProgramId = p.Id, Name = $"Year {y} Semester 1", YearLevel = y, SemesterNo = 1, StartDate = new DateOnly(2025, 2, 1), EndDate = new DateOnly(2025, 6, 30) });
                semesters.Add(new Semester { ProgramId = p.Id, Name = $"Year {y} Semester 2", YearLevel = y, SemesterNo = 2, StartDate = new DateOnly(2025, 8, 1), EndDate = new DateOnly(2025, 12, 15) });
            }
        }
        db.Semesters.AddRange(semesters);
        await db.SaveChangesAsync();
        return semesters;
    }

    private static async Task<List<Course>> EnsureCoursesAsync(AppDbContext db)
    {
        if (await db.Courses.AnyAsync()) return await db.Courses.ToListAsync();
        var courses = new[]
        {
            ("NUR101", "Fundamentals of Nursing", 4), ("NUR102", "Anatomy & Physiology", 5), ("NUR201", "Medical-Surgical Nursing", 6),
            ("NUR202", "Pharmacology", 4), ("NUR301", "Maternal & Child Health", 5), ("NUR302", "Community Health Nursing", 4),
            ("NUR401", "Nursing Research", 3), ("NUR402", "Nursing Leadership", 3), ("MID101", "Midwifery Practice", 5),
            ("NUR501", "Critical Care Nursing", 4)
        }.Select(c => new Course { Code = c.Item1, Name = c.Item2, CreditUnits = c.Item3, CourseType = "Core" }).ToList();
        db.Courses.AddRange(courses);
        await db.SaveChangesAsync();
        return courses;
    }

    private static async Task<List<ApplicationUser>> EnsureLecturersAsync(UserManager<ApplicationUser> userManager, Random random)
    {
        var existing = await userManager.GetUsersInRoleAsync(RoleNames.Lecturer);
        if (existing.Count >= 40) return existing.ToList();

        var lecturers = new List<ApplicationUser>();
        for (var i = existing.Count; i < 45; i++)
        {
            var first = UgandanNames.MaleFirst[i % UgandanNames.MaleFirst.Length];
            var last = UgandanNames.Surnames[i % UgandanNames.Surnames.Length];
            var user = new ApplicationUser
            {
                UserName = $"lecturer{i + 1}",
                Email = $"lecturer{i + 1}@nursingschool.local",
                EmailConfirmed = true,
                FirstName = first,
                LastName = last
            };
            await userManager.CreateAsync(user, "Lecturer@123");
            await userManager.AddToRoleAsync(user, RoleNames.Lecturer);
            lecturers.Add(user);
        }
        return lecturers.Concat(existing).ToList();
    }

    private static async Task<ApplicationUser> EnsureStaffUserAsync(UserManager<ApplicationUser> userManager, string username, string email, string role, string first, string last)
    {
        var user = await userManager.FindByNameAsync(username);
        if (user != null) return user;
        user = new ApplicationUser { UserName = username, Email = email, EmailConfirmed = true, FirstName = first, LastName = last };
        await userManager.CreateAsync(user, $"{role}@123");
        await userManager.AddToRoleAsync(user, role);
        return user;
    }

    private static async Task<List<CourseOffering>> EnsureOfferingsAsync(AppDbContext db, List<Course> courses, List<Semester> semesters, List<ApplicationUser> lecturers, Random random)
    {
        if (await db.CourseOfferings.AnyAsync()) return await db.CourseOfferings.Include(o => o.Course).ToListAsync();
        var offerings = new List<CourseOffering>();
        var activeSemesters = semesters.Take(8).ToList();
        foreach (var sem in activeSemesters)
        {
            foreach (var course in courses.Take(6))
            {
                offerings.Add(new CourseOffering
                {
                    CourseId = course.Id,
                    SemesterId = sem.Id,
                    LecturerId = lecturers[random.Next(lecturers.Count)].Id,
                    AcademicYear = "2025/2026"
                });
            }
        }
        db.CourseOfferings.AddRange(offerings);
        await db.SaveChangesAsync();
        return offerings;
    }

    private static async Task<List<AssessmentComponent>> EnsureAssessmentComponentsAsync(AppDbContext db, List<CourseOffering> offerings, Random random)
    {
        if (await db.AssessmentComponents.AnyAsync()) return await db.AssessmentComponents.ToListAsync();
        var components = new List<AssessmentComponent>();
        foreach (var o in offerings)
        {
            components.Add(new AssessmentComponent { CourseOfferingId = o.Id, Name = "Coursework", Weight = 40, MaxScore = 40 });
            components.Add(new AssessmentComponent { CourseOfferingId = o.Id, Name = "Final Exam", Weight = 60, MaxScore = 60 });
        }
        db.AssessmentComponents.AddRange(components);
        await db.SaveChangesAsync();
        return components;
    }

    private static async Task EnsureClinicalFacilitiesAsync(AppDbContext db)
    {
        if (await db.ClinicalFacilities.AnyAsync()) return;
        var facilities = new[]
        {
            ("Mulago National Referral Hospital", "Hospital"), ("Naguru Hospital", "Hospital"), ("Kiruddu Hospital", "Hospital"),
            ("Nsambya Hospital", "Hospital"), ("Mbarara Regional Referral", "Hospital"), ("Gulu Regional Referral", "Hospital"),
            ("Kawempe National Referral", "Hospital"), ("Entebbe Grade B", "Health Centre")
        };
        foreach (var (name, type) in facilities)
        {
            var f = new ClinicalFacility { Name = name, FacilityType = type, ContactPerson = "Matron Office", Phone = "+256700000000", Address = "Uganda" };
            db.ClinicalFacilities.Add(f);
            db.ClinicalSupervisors.Add(new ClinicalSupervisor { Facility = f, FullName = $"Sr. {UgandanNames.FemaleFirst[Random.Shared.Next(UgandanNames.FemaleFirst.Length)]} {UgandanNames.Surnames[Random.Shared.Next(UgandanNames.Surnames.Length)]}", Phone = "+256700000001" });
        }
        await db.SaveChangesAsync();
    }

    private static async Task EnsureSchoolEventsAsync(AppDbContext db, Guid adminId)
    {
        if (await db.SchoolEvents.AnyAsync()) return;
        db.SchoolEvents.AddRange(
            new SchoolEvent { Title = "New Student Orientation", Description = "Welcome week for incoming nursing students", EventType = "Academic", StartDate = DateTime.UtcNow.AddDays(14), EndDate = DateTime.UtcNow.AddDays(16), Location = "Main Campus Hall", TargetAudience = "All Students", CreatedBy = adminId },
            new SchoolEvent { Title = "Mid-Semester Examinations", Description = "Written and practical exams", EventType = "Examination", StartDate = DateTime.UtcNow.AddDays(30), EndDate = DateTime.UtcNow.AddDays(37), Location = "Examination Centre", TargetAudience = "All Students", CreatedBy = adminId },
            new SchoolEvent { Title = "Clinical Placement Briefing", Description = "Pre-placement orientation for Year 3 students", EventType = "Clinical", StartDate = DateTime.UtcNow.AddDays(21), EndDate = DateTime.UtcNow.AddDays(21), Location = "Clinical Skills Lab", TargetAudience = "Year 3 Students", CreatedBy = adminId },
            new SchoolEvent { Title = "Nurses' Day Celebration", Description = "Annual International Nurses Day event", EventType = "Social", StartDate = DateTime.UtcNow.AddDays(45), EndDate = DateTime.UtcNow.AddDays(45), Location = "Campus Grounds", TargetAudience = "All", CreatedBy = adminId },
            new SchoolEvent { Title = "Fee Payment Deadline", Description = "Final date for semester fee clearance", EventType = "Finance", StartDate = DateTime.UtcNow.AddDays(10), EndDate = DateTime.UtcNow.AddDays(10), Location = "Finance Office", TargetAudience = "Students with balances", CreatedBy = adminId },
            new SchoolEvent { Title = "Research Symposium", Description = "Final year nursing research presentations", EventType = "Academic", StartDate = DateTime.UtcNow.AddDays(60), EndDate = DateTime.UtcNow.AddDays(62), Location = "Auditorium", TargetAudience = "Year 4 Students", CreatedBy = adminId }
        );
        await db.SaveChangesAsync();
    }

    private static async Task EnsureFeeStructuresAsync(AppDbContext db, List<Program> programs)
    {
        if (await db.FeeStructures.CountAsync() > programs.Count) return;
        foreach (var p in programs)
        {
            db.FeeStructures.Add(new FeeStructure { ProgramId = p.Id, AcademicYear = "2025", FeeName = "Tuition", Amount = 4500000 });
            db.FeeStructures.Add(new FeeStructure { ProgramId = p.Id, AcademicYear = "2025", FeeName = "Clinical Fee", Amount = 1500000 });
        }
        await db.SaveChangesAsync();
    }

    public static async Task EnsureOnlineExamsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        if (await db.OnlineExams.CountAsync() >= 3)
        {
            await EnsureStudentEnrollmentsForExamsAsync(db, userManager, logger);
            return;
        }

        var creator = await userManager.FindByNameAsync("lecturer1")
            ?? await userManager.FindByNameAsync("admin");
        if (creator == null)
        {
            logger.LogWarning("Online exam seed skipped: no lecturer1 or admin account.");
            return;
        }

        var offerings = await db.CourseOfferings
            .Include(o => o.Course)
            .OrderBy(o => o.Course.Code)
            .ToListAsync();

        var targetCodes = new[] { "NUR101", "NUR201", "NUR202" };
        var enrollmentCounts = await db.Enrollments
            .GroupBy(e => e.CourseOfferingId)
            .Select(g => new { OfferingId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OfferingId, x => x.Count);

        var pickedOfferings = targetCodes
            .Select(code => offerings
                .Where(o => o.Course.Code == code)
                .OrderByDescending(o => enrollmentCounts.GetValueOrDefault(o.Id))
                .FirstOrDefault())
            .Where(o => o != null)
            .Cast<CourseOffering>()
            .ToList();

        if (pickedOfferings.Count < 3)
        {
            pickedOfferings = offerings
                .GroupBy(o => o.Course.Code)
                .Take(3)
                .Select(g => g.First())
                .ToList();
        }

        if (pickedOfferings.Count < 3)
        {
            logger.LogWarning("Online exam seed skipped: need at least 3 course offerings.");
            return;
        }

        var now = DateTime.UtcNow;
        var examTemplates = new[]
        {
            (
                Title: "Fundamentals of Nursing — Mid-Semester Test",
                Instructions: "Answer all questions. Each question has one best answer.",
                Questions: new (string Text, string Type, (string Text, bool Correct)[] Options)[]
                {
                    (
                        "What is the normal adult resting heart rate range (beats per minute)?",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("40–60 bpm", false), ("60–100 bpm", true), ("100–140 bpm", false), ("140–180 bpm", false) }
                    ),
                    (
                        "Hand hygiene should be performed before and after every patient contact.",
                        OnlineExamQuestionTypes.TrueFalse,
                        new[] { ("True", true), ("False", false) }
                    ),
                    (
                        "Which vital sign is measured in millimetres of mercury (mmHg)?",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("Temperature", false), ("Pulse", false), ("Blood pressure", true), ("Respiratory rate", false) }
                    ),
                }
            ),
            (
                Title: "Medical-Surgical Nursing — Objective Quiz",
                Instructions: "Select the most accurate answer for each question.",
                Questions: new (string Text, string Type, (string Text, bool Correct)[] Options)[]
                {
                    (
                        "A patient with type 2 diabetes should be monitored primarily for:",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("Hyperglycaemia", true), ("Hyperkalaemia", false), ("Hypothermia", false), ("Bradycardia", false) }
                    ),
                    (
                        "Deep vein thrombosis prophylaxis may include early mobilisation.",
                        OnlineExamQuestionTypes.TrueFalse,
                        new[] { ("True", true), ("False", false) }
                    ),
                    (
                        "Post-operative wound infection is best prevented by:",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("Restricting fluids", false), ("Aseptic technique", true), ("Prolonged bed rest", false), ("High-dose antibiotics for all patients", false) }
                    ),
                }
            ),
            (
                Title: "Pharmacology — Dosage & Safety Test",
                Instructions: "This test covers basic medication safety and calculations.",
                Questions: new (string Text, string Type, (string Text, bool Correct)[] Options)[]
                {
                    (
                        "Before administering any medication, the nurse must verify:",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("Patient identity only", false), ("Right patient, drug, dose, route, and time", true), ("Prescription date only", false), ("Pharmacy label colour", false) }
                    ),
                    (
                        "Intramuscular injections should never be given in an inflamed or oedematous site.",
                        OnlineExamQuestionTypes.TrueFalse,
                        new[] { ("True", true), ("False", false) }
                    ),
                    (
                        "Which route provides the fastest systemic drug absorption?",
                        OnlineExamQuestionTypes.MultipleChoice,
                        new[] { ("Oral", false), ("Subcutaneous", false), ("Intravenous", true), ("Topical", false) }
                    ),
                }
            ),
        };

        for (var i = 0; i < examTemplates.Length; i++)
        {
            var template = examTemplates[i];
            var offering = pickedOfferings[i];
            var exam = new OnlineExam
            {
                CourseOfferingId = offering.Id,
                CreatedByUserId = creator.Id,
                Title = template.Title,
                Instructions = template.Instructions,
                Status = QuizStatuses.Published,
                PublishedAt = now.AddDays(-7 + i),
                CreatedBy = creator.Id,
            };

            var questionOrder = 0;
            foreach (var question in template.Questions)
            {
                var q = new OnlineExamQuestion
                {
                    Text = question.Text,
                    QuestionType = question.Type,
                    Points = 1,
                    SortOrder = questionOrder++,
                    CreatedBy = creator.Id,
                };

                var optionOrder = 0;
                foreach (var option in question.Options)
                {
                    q.Options.Add(new OnlineExamOption
                    {
                        Text = option.Text,
                        IsCorrect = option.Correct,
                        SortOrder = optionOrder++,
                        CreatedBy = creator.Id,
                    });
                }

                exam.Questions.Add(q);
            }

            db.OnlineExams.Add(exam);
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} published online exams.", examTemplates.Length);
        await EnsureStudentEnrollmentsForExamsAsync(db, userManager, logger);
    }

    private static async Task EnsureStudentEnrollmentsForExamsAsync(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ILogger<AppDbContext> logger)
    {
        var examOfferingIds = await db.OnlineExams
            .Where(e => e.Status == QuizStatuses.Published)
            .Select(e => e.CourseOfferingId)
            .Distinct()
            .ToListAsync();

        if (examOfferingIds.Count == 0) return;

        var creator = await userManager.FindByNameAsync("admin");
        var studentUsers = await userManager.GetUsersInRoleAsync(RoleNames.Student);
        var added = 0;

        foreach (var user in studentUsers)
        {
            var studentId = await StudentAccountResolver.ResolveStudentIdAsync(db, user, CancellationToken.None);
            if (studentId == null) continue;

            var student = await db.Students.FirstAsync(s => s.Id == studentId);

            foreach (var offeringId in examOfferingIds)
            {
                if (await db.Enrollments.AnyAsync(e => e.StudentId == student.Id && e.CourseOfferingId == offeringId))
                    continue;

                db.Enrollments.Add(new Enrollment
                {
                    StudentId = student.Id,
                    CourseOfferingId = offeringId,
                    EnrollmentDate = student.AdmissionDate,
                    Status = EnrollmentStatuses.Enrolled,
                    CreatedBy = creator?.Id,
                });
                added++;
            }
        }

        if (added > 0)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Linked {Count} student enrollments to seeded online exam offerings.", added);
        }
    }
}
