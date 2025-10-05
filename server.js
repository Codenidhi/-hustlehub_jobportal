const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// File paths
const USERS_FILE = path.join(__dirname, 'users.json');
const JOBS_FILE = path.join(__dirname, 'jobs.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const APPLICATIONS_FILE = path.join(__dirname, 'applications.json');

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]');
}
if (!fs.existsSync(JOBS_FILE)) {
  fs.writeFileSync(JOBS_FILE, '[]');
}
if (!fs.existsSync(NOTIFICATIONS_FILE)) {
  fs.writeFileSync(NOTIFICATIONS_FILE, '[]');
}
if (!fs.existsSync(APPLICATIONS_FILE)) {
  fs.writeFileSync(APPLICATIONS_FILE, '[]');
}

// Utility to read JSON file
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = fs.readFileSync(file, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return [];
  }
}

// Utility to write JSON file
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`✅ Successfully wrote to ${file}`);
  } catch (error) {
    console.error(`Error writing to ${file}:`, error);
  }
}

// ---------------- USERS ---------------- //

// Get all users
app.get('/users', (req, res) => {
  const users = readJSON(USERS_FILE);
  res.json(users);
});

// Add new user (signup)
app.post('/users', (req, res) => {
  const users = readJSON(USERS_FILE);
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (users.some(u => u.email === email)) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  const newUser = { id: Date.now(), name, email, password, role };
  users.push(newUser);
  writeJSON(USERS_FILE, users);

  res.json({ success: true, message: "User created!" });
});

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  res.json({ success: true, message: "Login successful", user });
});

// ---------------- JOBS ---------------- //

// POST - Add Job
app.post('/jobs', (req, res) => {
  try {
    console.log('📥 Received job post request:', req.body);
    
    const jobs = readJSON(JOBS_FILE);
    const { title, company, location, type, salary, description, requirements } = req.body;

    if (!title || !company || !location) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newJob = {
      id: Date.now(),
      title,
      company,
      location,
      type: type || 'Full Time',
      salary: salary || 'Not specified',
      description: description || '',
      requirements: requirements || '',
      postedDate: new Date().toISOString()
    };

    jobs.push(newJob);
    writeJSON(JOBS_FILE, jobs);

    // Create notifications for all job seekers
    const users = readJSON(USERS_FILE);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    users.forEach(user => {
      if (user.role === 'jobseeker') {
        const notification = {
          id: Date.now() + Math.random(),
          userId: user.id,
          jobId: newJob.id,
          title: '🎉 New Job Posted!',
          message: `${title} at ${company} in ${location}`,
          jobTitle: title,
          company: company,
          location: location,
          type: type,
          read: false,
          createdAt: new Date().toISOString()
        };
        notifications.push(notification);
      }
    });

    writeJSON(NOTIFICATIONS_FILE, notifications);

    console.log('✅ Job added successfully:', newJob);
    console.log(`📊 Total jobs in database: ${jobs.length}`);
    
    res.json({ success: true, message: 'Job added successfully!', job: newJob });
  } catch (error) {
    console.error('❌ Error adding job:', error);
    res.status(500).json({ success: false, message: 'Error adding job: ' + error.message });
  }
});

// GET - All Jobs
app.get('/jobs', (req, res) => {
  try {
    const jobs = readJSON(JOBS_FILE);
    console.log(`📋 Fetching ${jobs.length} jobs`);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json([]);
  }
});

// GET - Search Jobs
app.get('/jobs/search', (req, res) => {
  try {
    const { title, location, type } = req.query;
    let jobs = readJSON(JOBS_FILE);

    if (title) {
      jobs = jobs.filter(job =>
        job.title.toLowerCase().includes(title.toLowerCase()) ||
        job.company.toLowerCase().includes(title.toLowerCase())
      );
    }

    if (location) {
      jobs = jobs.filter(job =>
        job.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (type) {
      jobs = jobs.filter(job => job.type === type);
    }

    console.log(`🔍 Search results: ${jobs.length} jobs found`);
    res.json(jobs);
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json([]);
  }
});

// DELETE - Remove Job
app.delete('/jobs/:id', (req, res) => {
  try {
    const jobs = readJSON(JOBS_FILE);
    const jobId = parseInt(req.params.id);
    const filteredJobs = jobs.filter(job => job.id !== jobId);

    if (jobs.length === filteredJobs.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    writeJSON(JOBS_FILE, filteredJobs);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ success: false, message: 'Error deleting job' });
  }
});

// ---------------- APPLICATIONS ---------------- //

// POST - Submit application
app.post('/applications', (req, res) => {
  try {
    console.log('📥 Received application:', req.body);
    
    const applications = readJSON(APPLICATIONS_FILE);
    const { jobId, name, email, phone, location, qualification, resumeFileName, interviewPreference, message } = req.body;

    if (!jobId || !name || !email || !phone || !location || !qualification) {
      console.log('❌ Missing required application fields');
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newApplication = {
      id: Date.now(),
      jobId: parseInt(jobId),
      name,
      email,
      phone,
      location,
      qualification,
      resumeFileName: resumeFileName || 'Not provided',
      interviewPreference: interviewPreference || 'Not specified',
      message: message || '',
      inviteSent: false,
      appliedDate: new Date().toISOString()
    };

    applications.push(newApplication);
    writeJSON(APPLICATIONS_FILE, applications);

    console.log('✅ Application submitted successfully:', newApplication);
    console.log(`📊 Total applications: ${applications.length}`);
    
    res.json({ success: true, message: 'Application submitted successfully!', application: newApplication });
  } catch (error) {
    console.error('❌ Error submitting application:', error);
    res.status(500).json({ success: false, message: 'Error submitting application: ' + error.message });
  }
});

// GET - Get all applications for a specific job
app.get('/applications/job/:jobId', (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const applications = readJSON(APPLICATIONS_FILE);
    
    const jobApplications = applications.filter(app => app.jobId === jobId);
    console.log(`📋 Fetching ${jobApplications.length} applications for job ${jobId}`);
    
    res.json(jobApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json([]);
  }
});

// GET - Get all applications
app.get('/applications', (req, res) => {
  try {
    const applications = readJSON(APPLICATIONS_FILE);
    console.log(`📋 Fetching all ${applications.length} applications`);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json([]);
  }
});

// PUT - Update application (send invitation) - WITH DETAILED DEBUGGING
app.put('/applications/:applicationId/invite', (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId);
    console.log('\n🔔 === SENDING INTERVIEW INVITATION ===');
    console.log(`Application ID: ${applicationId}`);
    
    const applications = readJSON(APPLICATIONS_FILE);
    const users = readJSON(USERS_FILE);
    const jobs = readJSON(JOBS_FILE);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    const application = applications.find(app => app.id === applicationId);
    
    if (!application) {
      console.log('❌ Application not found');
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    
    console.log(`📧 Application email: ${application.email}`);
    console.log(`👤 Application name: ${application.name}`);
    
    // Find the job details
    const job = jobs.find(j => j.id === application.jobId);
    if (!job) {
      console.log('❌ Job not found');
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    console.log(`💼 Job: ${job.title} at ${job.company}`);
    
    // Find the user by email - CASE INSENSITIVE SEARCH
    console.log(`\n🔍 Searching for user with email: ${application.email}`);
    console.log(`Total users in database: ${users.length}`);
    users.forEach((u, index) => {
      console.log(`  User ${index + 1}: ${u.email} (ID: ${u.id}, Role: ${u.role})`);
    });
    
    const user = users.find(u => u.email.toLowerCase() === application.email.toLowerCase());
    
    if (!user) {
      console.log(`❌ No user found with email: ${application.email}`);
      console.log(`⚠️  WARNING: Cannot send notification - user account not found!`);
      console.log(`   Please ensure the applicant has registered with email: ${application.email}`);
      
      // Still mark invitation as sent even if user not found
      application.inviteSent = true;
      application.inviteSentDate = new Date().toISOString();
      writeJSON(APPLICATIONS_FILE, applications);
      
      return res.json({ 
        success: true, 
        message: 'Invitation marked as sent, but user account not found for notification',
        warning: `No user registered with email ${application.email}`
      });
    }
    
    console.log(`✅ User found: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
    
    // Create notification for the applicant
    const notification = {
      id: Date.now() + Math.random(),
      userId: user.id,
      jobId: job.id,
      applicationId: application.id,
      title: '🎊 Interview Invitation!',
      message: `You've been invited for an interview for ${job.title} at ${job.company}. Interview mode: ${application.interviewPreference}`,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      type: 'Interview Invitation',
      read: false,
      createdAt: new Date().toISOString()
    };
    
    notifications.push(notification);
    writeJSON(NOTIFICATIONS_FILE, notifications);
    
    console.log(`🔔 Notification created successfully!`);
    console.log(`   Notification ID: ${notification.id}`);
    console.log(`   For User ID: ${user.id}`);
    console.log(`   Total notifications: ${notifications.length}`);
    
    // Mark invitation as sent
    application.inviteSent = true;
    application.inviteSentDate = new Date().toISOString();
    writeJSON(APPLICATIONS_FILE, applications);
    
    console.log('✅ Invitation sent successfully!');
    console.log('=== END INVITATION PROCESS ===\n');
    
    res.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      notificationCreated: true,
      userNotified: user.name
    });
  } catch (error) {
    console.error('❌ Error sending invitation:', error);
    res.status(500).json({ success: false, message: 'Error sending invitation: ' + error.message });
  }
});

// ---------------- NOTIFICATIONS ---------------- //

// GET - Get notifications for a specific user
app.get('/notifications/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    const userNotifications = notifications.filter(n => n.userId === userId);
    console.log(`🔔 Fetching ${userNotifications.length} notifications for user ${userId}`);
    
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json([]);
  }
});

// GET - Get unread notification count
app.get('/notifications/:userId/unread-count', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    const unreadCount = notifications.filter(n => n.userId === userId && !n.read).length;
    
    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ count: 0 });
  }
});

// PUT - Mark notification as read
app.put('/notifications/:notificationId/read', (req, res) => {
  try {
    const notificationId = parseFloat(req.params.notificationId);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      writeJSON(NOTIFICATIONS_FILE, notifications);
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(404).json({ success: false, message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// PUT - Mark all notifications as read for a user
app.put('/notifications/:userId/read-all', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    
    writeJSON(NOTIFICATIONS_FILE, notifications);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  }
});

// DELETE - Clear all notifications for a user
app.delete('/notifications/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = readJSON(NOTIFICATIONS_FILE);
    
    const filteredNotifications = notifications.filter(n => n.userId !== userId);
    writeJSON(NOTIFICATIONS_FILE, filteredNotifications);
    
    res.json({ success: true, message: 'Notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Error clearing notifications' });
  }
});

// Export for Vercel (serverless)
module.exports = app;