// Weather App Module
const WeatherApp = (() => {
    // DOM Elements
    const elements = {
        backgroundVideo: document.getElementById('background-video'),
        cityInput: document.getElementById('city'),
        searchButton: document.getElementById('search-button'),
        loader: document.querySelector('.loader'),
        weatherIcon: document.getElementById('weather-icon'),
        tempDiv: document.getElementById('temp-div'),
        weatherInfo: document.getElementById('weather-info'),
        hourlyForecast: document.getElementById('hourly-forecast'),
        autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
        weatherDetails: {
            humidity: document.getElementById('humidity'),
            realFeel: document.getElementById('real-feel'),
            wind: document.getElementById('wind'),
            windDirection: document.getElementById('wind-direction'),
            pressure: document.getElementById('pressure'),
            sunset: document.getElementById('sunset'),
            airQuality: document.getElementById('air-quality')
        }
    };

    // Configuration
    const config = {
        apiKey: '82cae2ba927441c52795212707b9969d',
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        geocodingUrl: 'https://api.openweathermap.org/geo/1.0/direct',
        videoPaths: {
            default: './assets/videos/default.mp4',
            sunny: './assets/videos/sunny.mp4',
            cloudy: './assets/videos/cloudy.mp4',
            rainy: './assets/videos/rainy.mp4',
            snowy: './assets/videos/snowy.mp4'
        },
        fallbackImage: './assets/images/fallback.jpg'
    };

    // Initialize the app
    const init = () => {
        setupEventListeners();
        setDefaultBackground();
    };

    // Set up event listeners
    const setupEventListeners = () => {
        elements.searchButton.addEventListener('click', handleSearch);
        elements.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        // Autocomplete listeners
        elements.cityInput.addEventListener('input', handleAutocomplete);
        elements.cityInput.addEventListener('focus', () => {
            if (elements.cityInput.value.trim().length > 0) {
                handleAutocomplete();
            }
        });
        document.addEventListener('click', (e) => {
            if (!elements.cityInput.contains(e.target) && !elements.autocompleteDropdown.contains(e.target)) {
                hideAutocompleteDropdown();
            }
        });
    };

    // Handle autocomplete
    const handleAutocomplete = debounce(async () => {
        const inputValue = elements.cityInput.value.trim();
        
        if (!inputValue || inputValue.length < 2) {
            hideAutocompleteDropdown();
            return;
        }

        try {
            const locations = await fetchLocations(inputValue);
            showAutocompleteDropdown(locations);
        } catch (error) {
            console.error('Autocomplete error:', error);
            hideAutocompleteDropdown();
        }
    }, 300);

    // Fetch locations for autocomplete
    const fetchLocations = async (query) => {
        const url = `${config.geocodingUrl}?q=${encodeURIComponent(query)}&limit=5&appid=${config.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    };

    // Show autocomplete dropdown
    const showAutocompleteDropdown = (locations) => {
        if (!locations || locations.length === 0) {
            hideAutocompleteDropdown();
            return;
        }

        elements.autocompleteDropdown.innerHTML = '';
        
        locations.forEach(location => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <span class="city-name">${location.name}</span>
                <span class="country-name">${location.country}${location.state ? `, ${location.state}` : ''}</span>
            `;
            
            item.addEventListener('click', () => {
                elements.cityInput.value = `${location.name}, ${location.country}`;
                hideAutocompleteDropdown();
                handleSearch();
            });
            
            elements.autocompleteDropdown.appendChild(item);
        });
        
        elements.autocompleteDropdown.classList.add('show');
    };

    // Hide autocomplete dropdown
    const hideAutocompleteDropdown = () => {
        elements.autocompleteDropdown.classList.remove('show');
    };

    // Debounce function for autocomplete
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // Set default background
    const setDefaultBackground = () => {
        elements.backgroundVideo.src = config.videoPaths.default;
        elements.backgroundVideo.load();
        elements.backgroundVideo.play().catch(e => {
            console.warn("Autoplay blocked. Showing fallback image.");
            document.body.style.backgroundImage = `url('${config.fallbackImage}')`;
        });
    };

    // Handle search
    const handleSearch = async () => {
        const inputValue = elements.cityInput.value.trim();
        
        if (!inputValue) {
            showAlert('Please enter a city name!');
            return;
        }

        toggleLoader(true);
        elements.searchButton.disabled = true;
        hideAutocompleteDropdown();

        try {
            const [city, country] = inputValue.split(',').map(s => s.trim());
            const location = country ? `${city},${country}` : city;

            const currentWeather = await fetchCurrentWeather(location);
            validateLocation(currentWeather, city, country);
            
            displayWeather(currentWeather);
            
            const forecast = await fetchForecast(location);
            displayHourlyForecast(forecast);
            
            if (currentWeather.coord) {
                const airQuality = await fetchAirQuality(currentWeather.coord.lat, currentWeather.coord.lon);
                displayAirQuality(airQuality);
            }
        } catch (error) {
            console.error(error);
            showAlert(error.message);
            clearWeatherData();
        } finally {
            toggleLoader(false);
            elements.searchButton.disabled = false;
        }
    };

    // Fetch current weather
    const fetchCurrentWeather = async (location) => {
        const url = `${config.baseUrl}/weather?q=${encodeURIComponent(location)}&units=metric&appid=${config.apiKey}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Location not found. Please check the spelling or try a different location.');
                }
                throw new Error(`Failed to fetch weather data. Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.cod !== 200) {
                throw new Error(data.message || 'Unknown error from API');
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching current weather:', error);
            throw error;
        }
    };

    // Fetch forecast
    const fetchForecast = async (location) => {
        const url = `${config.baseUrl}/forecast?q=${encodeURIComponent(location)}&units=metric&appid=${config.apiKey}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.cod !== '200') {
                throw new Error(data.message || 'Unknown error from API');
            }
            
            return data.list;
        } catch (error) {
            console.error('Error fetching forecast:', error);
            throw error;
        }
    };

    // Fetch air quality
    const fetchAirQuality = async (lat, lon) => {
        const url = `${config.baseUrl}/air_pollution?lat=${lat}&lon=${lon}&appid=${config.apiKey}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('Failed to fetch air quality data');
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching air quality:', error);
            return null;
        }
    };

    // Validate location
    const validateLocation = (data, searchedCity, searchedCountry) => {
        if (!data || !data.weather?.[0]) {
            throw new Error('Received invalid weather data');
        }

        const returnedCity = data.name.toLowerCase();
        const cityMatch = returnedCity.includes(searchedCity.toLowerCase());
        
        if (!cityMatch) {
            throw new Error(`We couldn't find "${searchedCity}". Did you mean "${data.name}"?`);
        }

        if (searchedCountry && data.sys?.country) {
            const returnedCountry = data.sys.country.toLowerCase();
            if (returnedCountry !== searchedCountry.toLowerCase()) {
                throw new Error(`Found ${data.name} in ${data.sys.country} instead of ${searchedCountry.toUpperCase()}.`);
            }
        }
    };

    // Display weather
    const displayWeather = (data) => {
        const { name, sys, main, weather, wind } = data;
        
        const cityName = name;
        const country = sys?.country ? `, ${sys.country}` : '';
        const temperature = Math.round(main.temp);
        const description = weather[0].description.toLowerCase();
        const iconCode = weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        elements.tempDiv.innerHTML = `<p>${temperature}°C</p>`;
        elements.weatherInfo.innerHTML = `<p>${cityName}${country}</p><p>${description}</p>`;
        elements.weatherIcon.src = iconUrl;
        elements.weatherIcon.alt = description;
        elements.weatherIcon.style.display = 'block';

        elements.weatherDetails.humidity.textContent = `${main.humidity}%`;
        elements.weatherDetails.realFeel.textContent = `${Math.round(main.feels_like)}°C`;
        elements.weatherDetails.wind.textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`;
        elements.weatherDetails.windDirection.textContent = getWindDirection(wind.deg);
        elements.weatherDetails.pressure.textContent = `${main.pressure} hPa`;

        if (sys?.sunset) {
            const sunsetTime = new Date(sys.sunset * 1000);
            elements.weatherDetails.sunset.textContent = sunsetTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }

        elements.weatherDetails.airQuality.textContent = 'Loading...';
        updateBackgroundVideo(description);
    };

    // Display hourly forecast
    const displayHourlyForecast = (hourlyData) => {
        elements.hourlyForecast.innerHTML = '';
        const next8Hours = hourlyData.slice(0, 8);

        next8Hours.forEach(item => {
            const dateTime = new Date(item.dt * 1000);
            const hour = dateTime.getHours();
            const temperature = Math.round(item.main.temp);
            const iconCode = item.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            hourlyItem.innerHTML = `
                <span>${hour}:00</span>
                <img src="${iconUrl}" alt="Hourly weather icon">
                <span>${temperature}°C</span>
            `;
            elements.hourlyForecast.appendChild(hourlyItem);
        });
    };

    // Display air quality
    const displayAirQuality = (data) => {
        if (!data?.list?.[0]) {
            elements.weatherDetails.airQuality.textContent = 'Unavailable';
            return;
        }

        const aqi = data.list[0].main.aqi;
        const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        const aqiDescription = aqiLevels[aqi - 1] || 'Unknown';
        const aqiColor = getAQIColor(aqi);

        elements.weatherDetails.airQuality.innerHTML = `
            <span style="color: ${aqiColor}">${aqiDescription} (${aqi})</span>
        `;
    };

    // Get AQI color
    const getAQIColor = (aqi) => {
        const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];
        return colors[aqi - 1] || '#9E9E9E';
    };

    // Get wind direction
    const getWindDirection = (degrees) => {
        if (degrees === undefined) return 'N/A';
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round((degrees % 360) / 45);
        return directions[index % 8];
    };

    // Update background video
    const updateBackgroundVideo = (description) => {
        let videoSrc = config.videoPaths.default;

        if (description.includes('clear')) {
            videoSrc = config.videoPaths.sunny;
        } else if (description.includes('cloud')) {
            videoSrc = config.videoPaths.cloudy;
        } else if (description.includes('rain') || description.includes('drizzle')) {
            videoSrc = config.videoPaths.rainy;
        } else if (description.includes('snow')) {
            videoSrc = config.videoPaths.snowy;
        }

        if (!elements.backgroundVideo.src.includes(videoSrc)) {
            elements.backgroundVideo.src = videoSrc;
            elements.backgroundVideo.load();
            elements.backgroundVideo.play().catch(e => {
                console.warn("Video autoplay blocked:", e);
                document.body.style.backgroundImage = `url('${config.fallbackImage}')`;
            });
        }
    };

    // Clear weather data
    const clearWeatherData = () => {
        elements.tempDiv.innerHTML = '';
        elements.weatherInfo.innerHTML = '';
        elements.weatherIcon.style.display = 'none';
        elements.hourlyForecast.innerHTML = '';
        
        Object.values(elements.weatherDetails).forEach(el => {
            if (el.textContent !== undefined) el.textContent = '--';
        });
    };

    // Toggle loader
    const toggleLoader = (show) => {
        elements.loader.style.display = show ? 'block' : 'none';
    };

    // Show alert
    const showAlert = (message) => {
        // You could replace this with a more elegant UI notification
        alert(message);
    };

    // Public API
    return {
        init
    };
})();

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', WeatherApp.init);