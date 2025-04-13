// src/app/services/role.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roles = [
    // ============================
    // Technology & IT Roles
    // ============================
    { name: 'Frontend Developer', color: '#61dafb' },
    { name: 'Backend Developer', color: '#4dc0b5' },
    { name: 'Full Stack Developer', color: '#FF5733' },
    { name: 'Mobile Developer', color: '#33FF57' },
    { name: 'iOS Developer', color: '#3357FF' },
    { name: 'Android Developer', color: '#FF33A8' },
    { name: 'Software Engineer', color: '#33FF8C' },
    { name: 'QA Engineer', color: '#FF8C33' },
    { name: 'DevOps Engineer', color: '#f6993f' },
    { name: 'Data Scientist', color: '#9f7aea' },
    { name: 'Data Engineer', color: '#33FFA5' },
    { name: 'Machine Learning Engineer', color: '#A833FF' },
    { name: 'AI Engineer', color: '#B833FF' },
    { name: 'Big Data Engineer', color: '#FF5733' },
    { name: 'Cloud Engineer', color: '#FF3380' },
    { name: 'Database Administrator', color: '#33D1FF' },
    { name: 'Network Engineer', color: '#FF5733' },
    { name: 'Security Engineer', color: '#8C33FF' },
    { name: 'Systems Administrator', color: '#5733FF' },
    { name: 'IT Manager', color: '#FF5733' },
    { name: 'Technical Support Specialist', color: '#33D1FF' },
    { name: 'Software Architect', color: '#33FF57' },
    { name: 'Embedded Systems Engineer', color: '#3357FF' },
    { name: 'Firmware Engineer', color: '#FF33D1' },
    { name: 'Game Developer', color: '#33A8FF' },
    { name: 'Virtual Reality Developer', color: '#FF5733' },
    { name: 'Augmented Reality Developer', color: '#33D1FF' },
    { name: 'Blockchain Developer', color: '#33FFA8' },
    { name: 'IoT Engineer', color: '#FF33C4' },
    { name: 'Robotics Engineer', color: '#FF5733' },
    { name: 'Cybersecurity Analyst', color: '#33FFBD' },
    { name: 'Information Security Manager', color: '#5733FF' },
    { name: 'IT Consultant', color: '#7D3C98' },

    // ============================
    // Design & Creative Roles
    // ============================
    { name: 'UI/UX Designer', color: '#3357FF' },
    { name: 'Graphic Designer', color: '#FF33A8' },
    { name: 'Industrial Designer', color: '#8C33FF' },
    { name: 'Product Designer', color: '#A833FF' },
    { name: 'Interior Designer', color: '#33FFA5' },
    { name: 'Fashion Designer', color: '#FF3380' },
    { name: 'Multimedia Artist', color: '#33D1FF' },
    { name: 'Illustrator', color: '#FF5733' },
    { name: 'Animator', color: '#33FF57' },
    { name: 'Video Editor', color: '#3357FF' },
    { name: 'Motion Graphics Designer', color: '#FF33D1' },
    { name: '3D Modeler', color: '#33A8FF' },
    { name: 'Web Designer', color: '#A833FF' },
    { name: 'Visual Designer', color: '#33FF8C' },
    { name: 'Creative Director', color: '#FF8C33' },
    { name: 'Art Director', color: '#33FFF3' },
    { name: 'Photographer', color: '#FF33A8' },
    { name: 'Video Producer', color: '#3357FF' },
    { name: 'Sound Designer', color: '#FF33D1' },

    // ============================
    // Marketing, Sales & Customer Roles
    // ============================
    { name: 'Digital Marketing Specialist', color: '#FF3380' },
    { name: 'SEO Specialist', color: '#33D1FF' },
    { name: 'Content Strategist', color: '#FF5733' },
    { name: 'Social Media Manager', color: '#A833FF' },
    { name: 'Sales Manager', color: '#33FF57' },
    { name: 'Account Manager', color: '#3357FF' },
    { name: 'Business Development Manager', color: '#FF33D1' },
    { name: 'Marketing Manager', color: '#33A8FF' },
    { name: 'Brand Manager', color: '#A833FF' },
    { name: 'Public Relations Specialist', color: '#FF33A8' },
    { name: 'Customer Success Manager', color: '#3357FF' },
    { name: 'CRM Specialist', color: '#FF33A8' },
    { name: 'Sales Engineer', color: '#33FF57' },
    { name: 'Retail Sales Associate', color: '#FF5733' },
    { name: 'Customer Service Representative', color: '#33D1FF' },
    { name: 'Advertising Manager', color: '#FF3380' },
    { name: 'Media Buyer', color: '#33D1FF' },
    { name: 'Copywriter', color: '#FF5733' },

    // ============================
    // Data, Analytics & Research Roles
    // ============================
    { name: 'Data Analyst', color: '#33FFA8' },
    { name: 'Business Intelligence Analyst', color: '#FF33C4' },
    { name: 'Data Architect', color: '#33D1FF' },
    { name: 'Statistician', color: '#FF5733' },
    { name: 'Operations Research Analyst', color: '#33FFBD' },
    { name: 'AI Research Scientist', color: '#33FFBD' },
    { name: 'Quantum Computing Researcher', color: '#5733FF' },
    { name: 'Market Research Analyst', color: '#FF3357' },
    { name: 'Survey Researcher', color: '#33FF8C' },
    { name: 'Research Assistant', color: '#3357FF' },
    { name: 'Economic Analyst', color: '#FF33A8' },

    // ============================
    // Infrastructure, Integration & Specialized Engineering Roles
    // ============================
    { name: 'Integration Developer', color: '#3357FF' },
    { name: 'Localization Specialist', color: '#FF33D1' },
    { name: 'Chatbot Developer', color: '#33A8FF' },
    { name: 'Blockchain Architect', color: '#A833FF' },
    { name: 'IT Risk Manager', color: '#33FFA8' },
    { name: 'Mobile Game Developer', color: '#FF33C4' },
    { name: 'Technical Recruiter', color: '#5733FF' },
    { name: 'Learning & Development Specialist', color: '#FF3357' },
    { name: 'Instructional Designer', color: '#3357FF' },
    { name: 'Sustainability Manager', color: '#FF33D1' },
    { name: 'Solutions Consultant', color: '#33A8FF' },
    { name: 'Database Architect', color: '#A833FF' },
    { name: 'Application Support Analyst', color: '#33FFA5' },
    { name: 'Telecom Engineer', color: '#FF33C4' },
    { name: 'Hardware Engineer', color: '#33D1FF' },
    { name: 'Electronics Engineer', color: '#FF5733' },
    { name: 'Field Service Technician', color: '#BADA55' },

    // ============================
    // Human Resources & Administration Roles
    // ============================
    { name: 'HR Manager', color: '#C0392B' },
    { name: 'HR Coordinator', color: '#E74C3C' },
    { name: 'Recruiter', color: '#F39C12' },
    { name: 'Talent Acquisition Specialist', color: '#F1C40F' },
    { name: 'Administrative Assistant', color: '#D35400' },
    { name: 'Office Manager', color: '#F5B041' },
    { name: 'Receptionist', color: '#F4D03F' },
    { name: 'Data Entry Clerk', color: '#D68910' },

    // ============================
    // Transportation & Logistics Roles
    // ============================
    { name: 'Truck Driver', color: '#FF5733' },
    { name: 'Delivery Driver', color: '#FF8C33' },
    { name: 'Pilot', color: '#FF33A8' },
    { name: 'Air Traffic Controller', color: '#3357FF' },
    { name: 'Logistics Manager', color: '#33FF57' },
    { name: 'Warehouse Manager', color: '#33D1FF' },
    { name: 'Forklift Operator', color: '#FF33D1' },
    { name: 'Supply Chain Analyst', color: '#A833FF' },

    // ============================
    // Energy, Mining & Utilities Roles
    // ============================
    { name: 'Energy Analyst', color: '#33FFA8' },
    { name: 'Renewable Energy Technician', color: '#33FFBD' },
    { name: 'Mining Engineer', color: '#5733FF' },
    { name: 'Oil Rig Worker', color: '#FF5733' },
    { name: 'Wind Turbine Technician', color: '#33D1FF' },
    { name: 'Solar Panel Installer', color: '#FF8C33' },

    // ============================
    // Scientific & Research Roles
    // ============================
    { name: 'Biologist', color: '#27AE60' },
    { name: 'Chemist', color: '#1ABC9C' },
    { name: 'Physicist', color: '#16A085' },
    { name: 'Astronomer', color: '#138D75' },
    { name: 'Research Scientist', color: '#922B21' },
    { name: 'Lab Technician', color: '#E67E22' },
    { name: 'Clinical Research Coordinator', color: '#F5B041' },

    // ============================
    // Construction, Manufacturing & Skilled Trades Roles
    // ============================
    { name: 'Construction Manager', color: '#5D6D7E' },
    { name: 'Carpenter', color: '#7D3C98' },
    { name: 'Welder', color: '#9B59B6' },
    { name: 'Machinist', color: '#8E44AD' },
    { name: 'Automotive Technician', color: '#5D6D7E' },
    { name: 'HVAC Technician', color: '#7FB3D5' },
    { name: 'Industrial Engineer', color: '#5499C7' },
    { name: 'Quality Control Inspector', color: '#5DADE2' },
    { name: 'Assembler', color: '#48C9B0' },
    { name: 'Factory Worker', color: '#45B39D' },
    { name: 'Mason', color: '#5D6D7E' },
    { name: 'Electrician', color: '#F39C12' },

    // ============================
    // Agriculture & Environment Roles
    // ============================
    { name: 'Farmer', color: '#28B463' },
    { name: 'Agricultural Technician', color: '#1D8348' },
    { name: 'Horticulturist', color: '#27AE60' },
    { name: 'Environmental Scientist', color: '#239B56' },
    { name: 'Conservation Officer', color: '#28B463' },
    { name: 'Landscape Architect', color: '#2ECC71' },
    { name: 'Forester', color: '#27AE60' },
    { name: 'Fisheries Manager', color: '#1ABC9C' },
    { name: 'Agronomist', color: '#16A085' },

    // ============================
    // Hospitality, Retail & Culinary Roles
    // ============================
    { name: 'Restaurant Manager', color: '#F39C12' },
    { name: 'Hotel Manager', color: '#F1C40F' },
    { name: 'Executive Chef', color: '#F1C40F' },
    { name: 'Sous Chef', color: '#E67E22' },
    { name: 'Pastry Chef', color: '#D35400' },
    { name: 'Line Cook', color: '#F5B041' },
    { name: 'Prep Cook', color: '#F4D03F' },
    { name: 'Kitchen Assistant', color: '#D68910' },
    { name: 'Bartender', color: '#D35400' },
    { name: 'Waiter/Waitress', color: '#F5B041' },
    { name: 'Barista', color: '#F4D03F' },
    { name: 'Retail Manager', color: '#D68910' },
    { name: 'Cashier', color: '#D35400' },
    { name: 'Concierge', color: '#F7DC6F' },
    { name: 'Travel Agent', color: '#F8C471' },

    // ============================
    // Arts, Entertainment & Sports Roles
    // ============================
    { name: 'Musician', color: '#9B59B6' },
    { name: 'Actor', color: '#8E44AD' },
    { name: 'Dancer', color: '#7D3C98' },
    { name: 'Director', color: '#5D6D7E' },
    { name: 'Producer', color: '#34495E' },
    { name: 'Screenwriter', color: '#2C3E50' },
    { name: 'Painter', color: '#BDC3C7' },
    { name: 'Sculptor', color: '#95A5A6' },
    { name: 'Museum Curator', color: '#7F8C8D' },
    { name: 'Art Conservator', color: '#AAB7B8' },
    { name: 'Professional Athlete', color: '#E74C3C' },
    { name: 'Coach', color: '#C0392B' },
    { name: 'Sports Analyst', color: '#9B59B6' },
    { name: 'Fitness Trainer', color: '#8E44AD' },
    { name: 'Yoga Instructor', color: '#7D3C98' },
    { name: 'Blogger', color: '#D35400' },
    { name: 'Podcaster', color: '#F39C12' },
    { name: 'Radio Host', color: '#F1C40F' },

    // ============================
    // Public Sector, Government & Non-Profit Roles
    // ============================
    { name: 'Public Administrator', color: '#E67E22' },
    { name: 'Diplomat', color: '#D35400' },
    { name: 'Policy Advisor', color: '#F5B041' },
    { name: 'Non-Profit Director', color: '#F4D03F' },
    { name: 'Charity Fundraiser', color: '#D68910' },
    { name: 'Community Organizer', color: '#34495E' },

    // ============================
    // Miscellaneous / Other Roles
    // ============================
    { name: 'Real Estate Agent', color: '#2ECC71' },
    { name: 'Urban Planner', color: '#27AE60' },
    { name: 'Event Planner', color: '#1ABC9C' },
    { name: 'Travel Blogger', color: '#16A085' },
    { name: 'Personal Assistant', color: '#45B39D' },
    { name: 'Executive Assistant', color: '#48C9B0' },
    { name: 'Business Consultant', color: '#5DADE2' },
    { name: 'Management Consultant', color: '#5499C7' },
    { name: 'Entrepreneur', color: '#7FB3D5' },
    { name: 'Venture Capitalist', color: '#5D6D7E' },
    { name: 'Fundraiser', color: '#7D3C98' },
    { name: 'Public Policy Analyst', color: '#9B59B6' },
    { name: 'Government Relations Specialist', color: '#8E44AD' },
    { name: 'Politician', color: '#7D3C98' },
    { name: 'Lobbyist', color: '#5D6D7E' },
    { name: 'Other', color: '#BADA55' }
  ];

  // Return roles sorted alphabetically by the 'name' property
  getRoles() {
    return this.roles.sort((a, b) => a.name.localeCompare(b.name));
  }

  getRoleColor(roleName: string): string {
    const role = this.roles.find(r => r.name === roleName);
    return role ? role.color : '#cccccc';
  }
}
