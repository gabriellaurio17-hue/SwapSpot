export const listings = [
  { id: 'calc-fx991', title: 'Casio fx-991ES Plus', category: 'Calculators', condition: 'Like new', price: '₱40 / day', mode: 'Rent', rating: 4.9, location: 'Library · 0.4 km', art: 'calculator', under500: true },
  { id: 'calculus-book', title: 'Calculus: Early Transcendentals', category: 'Textbooks', condition: 'Good', price: '₱320', mode: 'Sell', rating: 4.8, location: 'Main campus', art: 'book', under500: true },
  { id: 'multimeter', title: 'Digital multimeter', category: 'Lab gear', condition: 'Very good', price: '₱70 / day', mode: 'Rent', rating: 5, location: 'Engineering bldg.', art: 'multimeter', under500: true },
  { id: 'org-shirt', title: 'CIT-U Engineering shirt', category: 'Org merch', condition: 'New', price: '₱350', mode: 'Sell', rating: 4.7, location: 'Student center', art: 'shirt', under500: true },
  { id: 'physics-book', title: 'University Physics, 15th ed.', category: 'Textbooks', condition: 'Good', price: '₱480', mode: 'Sell', rating: 4.9, location: 'Library · 0.2 km', art: 'book', under500: true },
  { id: 'lab-meter-pro', title: 'Precision clamp meter', category: 'Lab gear', condition: 'Like new', price: '₱650 / day', mode: 'Rent', rating: 4.8, location: 'Engineering bldg.', art: 'multimeter', under500: false },
];

export const shops = [
  { id: 'engineering-council', name: 'Engineering Student Council', rating: 4.9, reviews: 28, officers: ['MC', 'AJ', 'KR'], subtitle: 'Made by students, for students' },
  { id: 'cit-artists', name: 'CIT-U Creatives Guild', rating: 4.8, reviews: 16, officers: ['JM', 'LS'], subtitle: 'Campus-made goods with a little extra heart' },
];

export const shopItems = [
  { id: 'heritage-tee', name: 'Heritage tee', description: 'CIT-U essentials · unisex', price: '₱420', sizes: ['S', 'M', 'L', 'XL'], art: 'shirt' },
  { id: 'campus-notes', name: 'Campus notebook', description: 'Limited edition · 80 pages', price: '₱160', sizes: ['A5'], art: 'book' },
  { id: 'org-tee', name: 'Engineering org tee', description: 'Official org merch', price: '₱380', sizes: ['S', 'M', 'L'], art: 'shirt' },
];

export const rentals = [
  { id: 'rental-1', role: "I’m renting", item: 'Casio fx-991ES Plus', person: 'From Mika C.', status: 'Ongoing', dates: 'Oct 16 – Oct 19, 2026', deposit: '₱200', dueSoon: true, action: 'Message Mika' },
  { id: 'rental-2', role: "I’m lending", item: 'Digital multimeter', person: 'To Paolo R.', status: 'Approved', dates: 'Oct 21 – Oct 23, 2026', deposit: '₱300', dueSoon: false, action: 'View request' },
  { id: 'rental-3', role: "I’m renting", item: 'Calculus textbook', person: 'From Ana L.', status: 'Requested', dates: 'Oct 25 – Oct 28, 2026', deposit: '₱100', dueSoon: false, action: 'Cancel request' },
];

export const steps = [
  { id: 'verify', title: 'Verify', text: 'Join with your @cit.edu email.' },
  { id: 'browse', title: 'List or browse', text: 'Find what you need on campus.' },
  { id: 'chat', title: 'Chat', text: 'Agree on details with a student.' },
  { id: 'pay', title: 'Pay and meet', text: 'Exchange safely in person.' },
  { id: 'rate', title: 'Return and rate', text: 'Close the deal and leave a review.' },
];

export const reports = [
  { id: 'report-1', item: 'Broken phone charger', reason: 'Item description may be misleading', reporter: 'Student · Oct 16' },
  { id: 'report-2', item: 'Vintage calculus notes', reason: 'Possible copyright concern', reporter: 'Faculty · Oct 15' },
];

export const applications = [
  { id: 'app-1', name: 'CIT-U Robotics Society', contact: 'M. Cabahug · @cit.edu', submitted: 'Oct 16, 2026' },
  { id: 'app-2', name: 'Architecture Student Council', contact: 'J. Ramos · @cit.edu', submitted: 'Oct 15, 2026' },
];

export const chatHistory = [
  { id: 'message-1', sender: 'Mika', text: 'Hi! The calculator is available this week. Where would you like to meet?', own: false },
  { id: 'message-2', sender: 'You', text: 'Could we meet by the library entrance after class?', own: true },
  { id: 'message-3', sender: 'Mika', text: 'Sounds good. I’ll bring the charger and the case too.', own: false },
];