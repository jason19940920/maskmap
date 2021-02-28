const cityName = document.querySelector('#city-name');
const areaName = document.querySelector('#area-name');
const searchButton = document.querySelector('#search-button');
let storeCluster;

// 隱藏左側選單
const storeContainer = document.querySelector('#selected-store-container');
const slideButton = document.querySelector('#slide-button');
const closeButton = document.querySelector('#close-button');
slideButton.addEventListener('click', () => {
    storeContainer.classList.remove("hide-container"); 
    slideButton.classList.remove("flex"); 
    slideButton.classList.add("none");    
})
closeButton.addEventListener('click', () => {
    storeContainer.classList.add("hide-container");
    slideButton.classList.remove("none");
    slideButton.classList.add("flex");
})

// 設置地圖
function setMap(){

    map = L.map("map", {
        center: [25.033976, 121.5623502],
        zoom: 15,
        zoomControl: false
    });
    
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // 設定圖層資料
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '<a href="#">copyright</a>'
    }).addTo(map);

    // 群集管理   
    storeCluster = new L.MarkerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    }).addTo(map);
}

// 自訂座標樣式
let greenIcon = new L.Icon({
    iconUrl: "https://github.com/pointhi/leaflet-color-markers/blob/master/img/marker-icon-green.png?raw=true",
    iconSize: [25, 35], // 根據 Icon 的大小自行調整
    iconAnchor: [12, 41],
    popupAnchor: [1, -39],
    shadowSize: [41, 41]
});
let redIcon = new L.Icon({
    iconUrl: "https://github.com/pointhi/leaflet-color-markers/blob/master/img/marker-icon-red.png?raw=true",
    iconSize: [25, 35], // 根據 Icon 的大小自行調整
    iconAnchor: [12, 41],
    popupAnchor: [1, -39],
    shadowSize: [41, 41]
});

// 獲取API
function getXML(dataPath) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        if(xhr.status == 200) {        
          const data = JSON.parse(xhr.response);
          resolve(data);
        } else {
          console.log("Can't get data!");
        }
      };
      xhr.open('get', dataPath);
      xhr.send();
    })
}

const getCityData = getXML('https://raw.githubusercontent.com/donma/TaiwanAddressCityAreaRoadChineseEnglishJSON/master/AllData.json');
const getStoreData = getXML('https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json');

// 資料獲取完畢，更新畫面資訊
Promise.all([getCityData, getStoreData]).then(result => {
    const cityData = result[0];
    const storeData = result[1].features;

    console.log(storeData);
    createCityOption(cityData);
    createAreaOption(cityData, "臺北市");
    setMap();
    
    setStore(storeData);
  
    cityName.addEventListener('change', function() {
      const selectedCity = cityName.value;
      createAreaOption(cityData, selectedCity);
      findStore(storeData, selectedCity, false);
    })
  
    areaName.addEventListener('change', function() {
      const selectedCity = cityName.value;
      const selectedArea = areaName.value;
      findStore(storeData, selectedCity, selectedArea);
    })
})

// 標出每家藥局的位置和口罩庫存。
function setStore(storeInfo) {
    storeInfo.forEach(store => {

        let locationIcon;  
        if(Number(store.properties.mask_adult) <= 1000) {
            locationIcon = redIcon;
        } else {
            locationIcon = greenIcon;
        }
      
        const storePosition = L.marker([store.geometry.coordinates[1], store.geometry.coordinates[0]], {icon: locationIcon});
        storePosition.bindPopup(`
        <h4>${store.properties.name}</h4>
        <p><i class="fas fa-map-marker-alt"></i>${store.properties.address}</p>
        <p><i class="fas fa-phone"></i>${store.properties.phone}</p>
        <p>成人口罩剩餘數量:<span class="adultMaskNumber">${store.properties.mask_adult}</span></p>
        <p>兒童口罩剩餘數量:<span class="childMaskNumber">${store.properties.mask_child}</span></p>                            
        `);
        storeCluster.addLayer(storePosition);
    })  
    map.addLayer(storeCluster);
}

// 產生城市搜尋欄位裡的選項。
function createCityOption(cityData) {  
    let cityOption = '';
    cityData.forEach(item => {
      cityOption += `<option value="${item.CityName}">${item.CityName}</option>`;
    })
    cityName.innerHTML = `<option value="" selected disabled>請選擇縣市</option>${cityOption}`;
  }
  
// 產生鄉鎮市區搜尋欄位裡的選項。
function createAreaOption(cityData, citySelected) {
    const citySelectedObj = cityData.find(item => item.CityName === citySelected);
    const areaArray = citySelectedObj.AreaList;

    let areaOption = '';
    areaArray.forEach(item => {
        areaOption += `<option value="${item.AreaName}">${item.AreaName}</option>`;
    })
    areaName.innerHTML = `<option selected disabled>請選擇鄉鎮市區</option>${areaOption}`;
}
  
// create搜尋商店清單
function createStoreList(store, storeList) {
    storeList += `
    <div id="store-infomation" data-lat="${store.geometry.coordinates[1]}" data-lng="${store.geometry.coordinates[0]}">
      <h3>${store.properties.name}</h3>
      <p><i class="fas fa-map-marker-alt"></i>${store.properties.address}</p>
      <p><i class="fas fa-phone"></i>${store.properties.phone}</p>
      <div id="adultMaskNumber"><p>成人口罩剩餘數量:<span>${store.properties.mask_adult}</span></p></div>
      <div id="childMaskNumber"><p>兒童口罩剩餘數量:<span>${store.properties.mask_child}</span></p></div>
    </div>                      
    `;

    return [storeList];
}
  
// 搜尋選擇地區的藥局資訊。
function findStore(stores, selectedCity, selectedArea) {
    let str = ``;
    let storeList = [];
  
    if(!selectedArea) {
      storeList = stores.filter(store => store.properties.address.includes(selectedCity));
    } else if(selectedArea === 'all') {
      findStore(stores, selectedCity, false); return;
    } else {
      storeList = stores.filter(store => store.properties.address.includes(selectedCity + selectedArea));
    }
  
    storeList.forEach(store => {
      [str] = createStoreList(store, str);
    })
    document.getElementById('store-list').innerHTML = str;

    // 地圖自動定位到該區域
    if(selectedArea){
      map.setView([storeList[0].geometry.coordinates[1], storeList[0].geometry.coordinates[0]], 14);
    };
  
    // 點擊藥局資訊會定位至該位置
    const storeInfomation = document.querySelectorAll('#store-infomation');
    storeInfomation.forEach(store => {
      store.addEventListener('click', function() {
        map.setView([store.dataset.lat, store.dataset.lng],  20);
      })
    })
}
  
 