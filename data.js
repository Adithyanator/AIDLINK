// ======= SHARED DATA STORE WITH LOCALSTORAGE SYNC =======

const DEFAULT_STORE = {
  camps: [
    { id:2, name:'Camp Beta',  district:'District 7', capacity:200, occupied:110, contact:'Priya Shah',  status:'active', needs:['Water','Clothes'],  zone:'moderate', lat: 13.0121, lng: 80.2364 },
    { id:3, name:'Camp Gamma', district:'District 11',capacity:500, occupied:490, contact:'Arjun Mehta', status:'full',   needs:['Food','Water','Medicine'], zone:'critical', lat: 12.9860, lng: 80.2205 },
    { id:4, name:'Camp Delta', district:'District 2', capacity:150, occupied:60,  contact:'Kavya Nair',  status:'active', needs:['Blankets'],  zone:'moderate', lat: 13.1143, lng: 80.1436 },
    { id:5, name:'Camp Echo',  district:'District 14',capacity:300, occupied:95,  contact:'Vikram Das',  status:'active', needs:[],            zone:'stable',   lat: 12.8981, lng: 80.2198 },
  ],
  requests: [
    { id:1, location:'Sector 4, Chennai',   pin:'600001', type:'Food',     people:45, urgency:'critical', status:'pending',   time:'2m ago' },
    { id:2, location:'Anna Nagar, Chennai', pin:'600040', type:'Water',    people:120, urgency:'critical', status:'pending',  time:'5m ago' },
    { id:3, location:'Guindy, Chennai',     pin:'600032', type:'Medicine', people:28,  urgency:'critical', status:'pending',  time:'9m ago' },
    { id:4, location:'T Nagar, Chennai',    pin:'600017', type:'Clothes',  people:80,  urgency:'moderate', status:'pending',  time:'18m ago' },
    { id:5, location:'Velachery, Chennai',  pin:'600042', type:'Food',     people:35,  urgency:'moderate', status:'fulfilled',time:'32m ago' },
    { id:6, location:'Tambaram, Chennai',   pin:'600045', type:'Shelter',  people:60,  urgency:'low',      status:'pending',  time:'47m ago' },
  ],
  donors: [
    { id:1, name:'Aid India Trust',    phone:'+91 9800000001', resource:'Food',      contributions:12 },
    { id:2, name:'WaterFirst NGO',     phone:'+91 9800000002', resource:'Water',     contributions:8  },
    { id:3, name:'MediHelp Foundation',phone:'+91 9800000003', resource:'Medicine',  contributions:5  },
    { id:4, name:'Relief Corps',       phone:'+91 9800000004', resource:'Clothes',   contributions:20 },
    { id:5, name:'Suresh Kumar',       phone:'+91 9800000005', resource:'Funds',     contributions:3  },
    { id:6, name:'Chennai Gives',      phone:'+91 9800000006', resource:'Food',      contributions:9  },
  ],
  donations: [],
  activity: [
    { text:'Donation: 200 food packets received at Camp Beta', color:'green',  time:'2m ago' },
    { text:'New request: Water · 120 people · Anna Nagar',      color:'red',    time:'5m ago' },
    { text:'Camp Echo updated needs — Shelter required',         color:'amber',  time:'25m ago'},
    { text:'SMS received: HELP FOOD 5 PEOPLE LOCATION 600001',  color:'gray',   time:'29m ago'},
    { text:'Request #5 fulfilled — Velachery Food aid delivered',color:'green',  time:'45m ago'},
  ],
  smsLog: [],
};

// Initial load
let store = JSON.parse(localStorage.getItem('reliefnet_store')) || DEFAULT_STORE;

function saveStore() {
  localStorage.setItem('reliefnet_store', JSON.stringify(store));
}

// Helper to reset store if needed (e.g. for testing)
function resetStore() {
  localStorage.setItem('reliefnet_store', JSON.stringify(DEFAULT_STORE));
  store = DEFAULT_STORE;
  location.reload();
}
