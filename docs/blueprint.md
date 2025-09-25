# **App Name**: SheetSync Tracker

## Core Features:

- Employee Data Entry: Employees can enter task name, start time, end time, and other remarks via a web form after selecting their name from a dropdown.
- Data Validation: Validates the form data before submitting to ensure completeness.
- Geolocation tracking (optional): Ask the user for permission to access their location for optional logging alongside the other information. Provide an explanation as to why we want to log this information (e.g. compliance, auditing, etc).
- Google Sheets Integration: Automatically update a Google Sheet with the data entered, including employee name, task name, start time, end time, other remarks, and IP address/Geolocation. Can act as a "tool" within other LLM apps by populating Google Sheets using external sources.
- Device IP Address Recording: Record the IP address of the device used for data entry and log it in the Google Sheet alongside other data.
- Employee Authentication: A simple authentication mechanism to identify employees.
- Confirmation UI: After successful update display UI to show information was submitted. Have error and success notification on data submition to the user. 

## Style Guidelines:

- Primary color: Deep Blue (#3F51B5) to convey trust and efficiency.
- Background color: Light Gray (#F5F5F5), creating a clean and neutral backdrop.
- Accent color: Teal (#009688) to highlight interactive elements.
- Body and headline font: 'PT Sans', a modern sans-serif, is used for clear and readable text throughout the application.
- Use simple and clear icons from a library like Material Icons to represent actions and status.
- A clean, single-column layout optimized for mobile devices ensures ease of use.
- Subtle animations on form submission and data updates enhance the user experience.