# Code Examples for Data Art Tutorial

This document contains all the Python code snippets you'll need for the "Pulse of Data" portfolio project. These can be used directly in TouchDesigner DATs or adapted for your needs.

## Table of Contents
1. [API Data Fetcher](#api-data-fetcher)
2. [Data Processing & Normalization](#data-processing--normalization)
3. [Statistical Analysis](#statistical-analysis)
4. [Anomaly Detection](#anomaly-detection)
5. [TouchDesigner Integration](#touchdesigner-integration)
6. [UI Event Handlers](#ui-event-handlers)

---

## API Data Fetcher

### Basic CoinGecko API Fetcher
```python
# Place this in a Text DAT named "api_fetcher"
# This fetches cryptocurrency prices from CoinGecko API

import json
import urllib.request
import urllib.error
from datetime import datetime

class CryptoDataFetcher:
    def __init__(self):
        self.api_url = "https://api.coingecko.com/api/v3/simple/price"
        self.coins = "bitcoin,ethereum,solana"
        self.vs_currency = "usd"
        self.include_24h_change = "true"

        # Cache for storing historical data
        self.price_history = {
            'bitcoin': [],
            'ethereum': [],
            'solana': []
        }
        self.max_history = 100  # Keep last 100 readings

    def fetch_prices(self):
        """Fetch current cryptocurrency prices"""
        try:
            # Build URL with parameters
            url = f"{self.api_url}?ids={self.coins}&vs_currencies={self.vs_currency}&include_24hr_change={self.include_24h_change}"

            # Make request
            with urllib.request.urlopen(url, timeout=5) as response:
                data = json.loads(response.read().decode())

            # Extract and structure data
            result = {
                'timestamp': datetime.now().isoformat(),
                'bitcoin': {
                    'price': data['bitcoin']['usd'],
                    'change_24h': data['bitcoin'].get('usd_24h_change', 0)
                },
                'ethereum': {
                    'price': data['ethereum']['usd'],
                    'change_24h': data['ethereum'].get('usd_24h_change', 0)
                },
                'solana': {
                    'price': data['solana']['usd'],
                    'change_24h': data['solana'].get('usd_24h_change', 0)
                }
            }

            # Update history
            for coin in ['bitcoin', 'ethereum', 'solana']:
                self.price_history[coin].append(result[coin]['price'])
                # Keep only recent history
                if len(self.price_history[coin]) > self.max_history:
                    self.price_history[coin].pop(0)

            return result

        except urllib.error.URLError as e:
            print(f"Network error: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None

    def get_history(self, coin):
        """Get price history for a specific coin"""
        return self.price_history.get(coin, [])

# Create global instance
if 'fetcher' not in globals():
    fetcher = CryptoDataFetcher()

# Fetch and return current data
current_data = fetcher.fetch_prices()

if current_data:
    # Store in parent table or print
    print(json.dumps(current_data, indent=2))
else:
    print("Failed to fetch data")
```

---

## Data Processing & Normalization

### Data Processor Script
```python
# Place this in a Script DAT named "data_processor"
# This normalizes and processes the API data

import statistics
import math

class DataProcessor:
    def __init__(self):
        self.min_max_window = 100  # Window for min/max calculation

    def normalize(self, value, min_val, max_val):
        """Normalize value to 0-1 range"""
        if max_val == min_val:
            return 0.5
        return (value - min_val) / (max_val - min_val)

    def calculate_volatility(self, price_history):
        """Calculate volatility using standard deviation"""
        if len(price_history) < 2:
            return 0.0

        try:
            stdev = statistics.stdev(price_history)
            mean = statistics.mean(price_history)
            # Coefficient of variation (normalized volatility)
            cv = (stdev / mean) if mean != 0 else 0
            return min(cv * 10, 1.0)  # Scale and cap at 1.0
        except:
            return 0.0

    def calculate_moving_average(self, price_history, window=10):
        """Calculate simple moving average"""
        if len(price_history) < window:
            window = len(price_history)
        if window == 0:
            return 0
        return sum(price_history[-window:]) / window

    def process_crypto_data(self, raw_data, fetcher):
        """Process raw API data into normalized values"""

        if not raw_data:
            return None

        processed = {}

        for coin in ['bitcoin', 'ethereum', 'solana']:
            history = fetcher.get_history(coin)

            if not history:
                continue

            current_price = raw_data[coin]['price']
            change_24h = raw_data[coin]['change_24h']

            # Calculate statistics
            min_price = min(history)
            max_price = max(history)

            # Normalized values
            processed[coin] = {
                'price_raw': current_price,
                'price_normalized': self.normalize(current_price, min_price, max_price),
                'change_24h': change_24h,
                'change_normalized': self.normalize(change_24h + 50, -50, 50),  # Assume ±50% range
                'volatility': self.calculate_volatility(history),
                'sma_10': self.calculate_moving_average(history, 10),
                'sma_30': self.calculate_moving_average(history, 30),
                'trend': 1 if current_price > self.calculate_moving_average(history, 10) else 0
            }

        # Calculate market-wide metrics
        all_changes = [processed[coin]['change_24h'] for coin in processed]
        processed['market'] = {
            'average_change': statistics.mean(all_changes) if all_changes else 0,
            'overall_trend': 1 if statistics.mean(all_changes) > 0 else 0,
            'market_volatility': self.calculate_volatility(all_changes) if len(all_changes) > 1 else 0
        }

        return processed

# Create processor instance
if 'processor' not in globals():
    processor = DataProcessor()

# Example usage - assumes fetcher exists from previous script
if 'fetcher' in globals() and 'current_data' in globals():
    processed_data = processor.process_crypto_data(current_data, fetcher)

    if processed_data:
        # Output to table or channels
        for coin in ['bitcoin', 'ethereum', 'solana']:
            print(f"\n{coin.upper()}:")
            for key, value in processed_data[coin].items():
                print(f"  {key}: {value:.4f}")
```

---

## Statistical Analysis

### Advanced Statistical Analyzer
```python
# Place this in a Script DAT named "stats_analyzer"
# Advanced statistical analysis for data science

import statistics
import math

class StatisticalAnalyzer:
    def __init__(self):
        self.z_score_threshold = 2.5  # Standard deviations for anomaly

    def calculate_z_score(self, value, data_series):
        """Calculate z-score for anomaly detection"""
        if len(data_series) < 2:
            return 0.0

        try:
            mean = statistics.mean(data_series)
            stdev = statistics.stdev(data_series)

            if stdev == 0:
                return 0.0

            z_score = (value - mean) / stdev
            return z_score
        except:
            return 0.0

    def detect_anomaly(self, value, data_series, threshold=None):
        """Detect if current value is anomalous"""
        if threshold is None:
            threshold = self.z_score_threshold

        z_score = self.calculate_z_score(value, data_series)
        is_anomaly = abs(z_score) > threshold

        return {
            'is_anomaly': is_anomaly,
            'z_score': z_score,
            'severity': abs(z_score) / threshold if is_anomaly else 0
        }

    def calculate_correlation(self, series1, series2):
        """Calculate Pearson correlation coefficient"""
        if len(series1) != len(series2) or len(series1) < 2:
            return 0.0

        try:
            # Calculate means
            mean1 = statistics.mean(series1)
            mean2 = statistics.mean(series2)

            # Calculate correlation
            numerator = sum((x - mean1) * (y - mean2) for x, y in zip(series1, series2))

            sum_sq1 = sum((x - mean1) ** 2 for x in series1)
            sum_sq2 = sum((y - mean2) ** 2 for y in series2)

            denominator = math.sqrt(sum_sq1 * sum_sq2)

            if denominator == 0:
                return 0.0

            correlation = numerator / denominator
            return correlation
        except:
            return 0.0

    def calculate_rsi(self, prices, period=14):
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral

        # Calculate price changes
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]

        # Separate gains and losses
        gains = [change if change > 0 else 0 for change in changes[-period:]]
        losses = [-change if change < 0 else 0 for change in changes[-period:]]

        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))

        return rsi

    def detect_pattern(self, prices):
        """Simple pattern detection"""
        if len(prices) < 3:
            return "insufficient_data"

        recent = prices[-3:]

        # Check for trend
        if recent[0] < recent[1] < recent[2]:
            return "uptrend"
        elif recent[0] > recent[1] > recent[2]:
            return "downtrend"
        elif recent[1] > recent[0] and recent[1] > recent[2]:
            return "peak"
        elif recent[1] < recent[0] and recent[1] < recent[2]:
            return "trough"
        else:
            return "sideways"

    def analyze_complete(self, fetcher):
        """Complete analysis of all data"""
        analysis = {}

        # Analyze each coin
        for coin in ['bitcoin', 'ethereum', 'solana']:
            history = fetcher.get_history(coin)

            if len(history) < 2:
                continue

            current_price = history[-1]

            analysis[coin] = {
                'anomaly': self.detect_anomaly(current_price, history),
                'rsi': self.calculate_rsi(history),
                'pattern': self.detect_pattern(history),
                'volatility_level': self.classify_volatility(history)
            }

        # Cross-coin correlations
        btc_history = fetcher.get_history('bitcoin')
        eth_history = fetcher.get_history('ethereum')
        sol_history = fetcher.get_history('solana')

        min_len = min(len(btc_history), len(eth_history), len(sol_history))

        if min_len >= 2:
            analysis['correlations'] = {
                'btc_eth': self.calculate_correlation(btc_history[-min_len:], eth_history[-min_len:]),
                'btc_sol': self.calculate_correlation(btc_history[-min_len:], sol_history[-min_len:]),
                'eth_sol': self.calculate_correlation(eth_history[-min_len:], sol_history[-min_len:])
            }

        return analysis

    def classify_volatility(self, prices):
        """Classify volatility level"""
        if len(prices) < 2:
            return "unknown"

        stdev = statistics.stdev(prices)
        mean = statistics.mean(prices)
        cv = (stdev / mean) if mean != 0 else 0

        if cv < 0.02:
            return "low"
        elif cv < 0.05:
            return "medium"
        else:
            return "high"

# Create analyzer instance
if 'analyzer' not in globals():
    analyzer = StatisticalAnalyzer()

# Run analysis
if 'fetcher' in globals():
    analysis_results = analyzer.analyze_complete(fetcher)

    print("\n=== STATISTICAL ANALYSIS ===")
    for coin, data in analysis_results.items():
        if coin != 'correlations':
            print(f"\n{coin.upper()}:")
            print(f"  Pattern: {data['pattern']}")
            print(f"  RSI: {data['rsi']:.2f}")
            print(f"  Anomaly: {data['anomaly']['is_anomaly']}")
            if data['anomaly']['is_anomaly']:
                print(f"  Severity: {data['anomaly']['severity']:.2f}")

    if 'correlations' in analysis_results:
        print("\nCORRELATIONS:")
        for pair, corr in analysis_results['correlations'].items():
            print(f"  {pair}: {corr:.3f}")
```

---

## Anomaly Detection

### Event Trigger System
```python
# Place this in a CHOP Execute DAT
# Triggers visual effects when anomalies are detected

def onValueChange(channel, sampleIndex, val, prev):
    """Called when channel value changes"""

    # Monitor anomaly channel
    if channel.name == 'anomaly_detected':
        if val == 1 and prev == 0:  # Rising edge
            trigger_anomaly_effect()

def trigger_anomaly_effect():
    """Execute visual response to anomaly"""

    # Get reference to particle system
    particle_sop = op('/project1/data_art_system/visualization/main_particles')

    # Get reference to timer for burst duration
    burst_timer = op('/project1/data_art_system/visualization/burst_timer')

    # Increase particle count dramatically
    original_count = particle_sop.par.particles.eval()
    particle_sop.par.particles = original_count * 4

    # Start timer to restore normal count
    burst_timer.par.initialize.pulse()

    # Flash background
    background_mat = op('/project1/data_art_system/visualization/background_material')
    background_mat.par.colorr = 1.0

    # Log event
    print(f"[ANOMALY DETECTED] at {datetime.now()}")

    # Trigger sound (if audio system exists)
    try:
        audio_player = op('/project1/data_art_system/output/anomaly_sound')
        audio_player.par.play.pulse()
    except:
        pass

def restore_normal_state():
    """Called by timer to restore normal visualization"""
    particle_sop = op('/project1/data_art_system/visualization/main_particles')
    particle_sop.par.particles = 50000

    background_mat = op('/project1/data_art_system/visualization/background_material')
    background_mat.par.colorr = 0.1
```

---

## TouchDesigner Integration

### Data to CHOP Converter
```python
# Place this in a Script DAT that outputs to CHOP
# Converts processed data to TouchDesigner channels

def get_channel_data():
    """Returns dictionary of channel names and values"""

    # Get processed data from processor
    if 'processed_data' not in globals():
        return {}

    channels = {}

    # Bitcoin channels
    channels['btc_price_norm'] = processed_data['bitcoin']['price_normalized']
    channels['btc_change'] = processed_data['bitcoin']['change_24h'] / 100.0
    channels['btc_volatility'] = processed_data['bitcoin']['volatility']
    channels['btc_trend'] = processed_data['bitcoin']['trend']

    # Ethereum channels
    channels['eth_price_norm'] = processed_data['ethereum']['price_normalized']
    channels['eth_change'] = processed_data['ethereum']['change_24h'] / 100.0
    channels['eth_volatility'] = processed_data['ethereum']['volatility']
    channels['eth_trend'] = processed_data['ethereum']['trend']

    # Solana channels
    channels['sol_price_norm'] = processed_data['solana']['price_normalized']
    channels['sol_change'] = processed_data['solana']['change_24h'] / 100.0
    channels['sol_volatility'] = processed_data['solana']['volatility']
    channels['sol_trend'] = processed_data['solana']['trend']

    # Market-wide
    channels['market_avg_change'] = processed_data['market']['average_change'] / 100.0
    channels['market_trend'] = processed_data['market']['overall_trend']
    channels['market_volatility'] = processed_data['market']['market_volatility']

    # Anomaly detection
    if 'analysis_results' in globals():
        channels['anomaly_detected'] = float(analysis_results['bitcoin']['anomaly']['is_anomaly'])
        channels['anomaly_severity'] = analysis_results['bitcoin']['anomaly'].get('severity', 0)

    return channels

# Execute to output channels
channel_data = get_channel_data()

# Output to table for conversion to CHOP
output_table = op('data_channels_table')
if output_table:
    output_table.clear()
    output_table.appendRow(['channel', 'value'])
    for name, value in channel_data.items():
        output_table.appendRow([name, value])
```

### Particle System Controller
```python
# Place this in a Script SOP or Point SOP
# Controls particle attributes based on data

import numpy as np

def apply_data_to_particles(scriptOp):
    """Apply data-driven attributes to particles"""

    # Get data channels
    data_chop = op('/project1/data_art_system/data_processing/data_channels')

    if not data_chop:
        return

    # Get current values
    btc_norm = data_chop['btc_price_norm'][0]
    eth_norm = data_chop['eth_price_norm'][0]
    sol_norm = data_chop['sol_price_norm'][0]
    volatility = data_chop['market_volatility'][0]

    # Access geometry
    geo = scriptOp.inputGeometry

    # Color particles based on crypto values
    for i, point in enumerate(geo.points):
        # Distribute coins across particles
        coin_id = i % 3

        if coin_id == 0:  # Bitcoin - gold
            point.color = (btc_norm, btc_norm * 0.7, 0)
        elif coin_id == 1:  # Ethereum - blue
            point.color = (0.2, 0.5, eth_norm)
        else:  # Solana - purple
            point.color = (sol_norm * 0.6, 0.2, sol_norm)

        # Size based on volatility
        size = 0.01 + (volatility * 0.05)
        point.P *= size

    scriptOp.copyInput(scriptOp.inputs[0])
```

---

## UI Event Handlers

### Control Panel Event Handler
```python
# Place this in a Script DAT for UI controls
# Handles UI interactions

def on_slider_change(comp, val):
    """Handle slider value changes"""

    if comp.name == 'particle_multiplier':
        base_count = 50000
        new_count = int(base_count * val)

        particle_sop = op('/project1/data_art_system/visualization/main_particles')
        particle_sop.par.particles = new_count

        print(f"Particle count: {new_count}")

def on_button_press(comp):
    """Handle button presses"""

    if comp.name == 'refresh_data':
        # Manually trigger data fetch
        fetcher_dat = op('/project1/data_art_system/data_processing/api_fetcher')
        fetcher_dat.run()
        print("Data refresh triggered")

    elif comp.name == 'record_toggle':
        # Toggle recording
        movie_out = op('/project1/data_art_system/output/movie_file_out')
        current_state = movie_out.par.record.eval()
        movie_out.par.record = not current_state

        if movie_out.par.record:
            print("Recording started")
            comp.par.label = "Stop Recording"
        else:
            print("Recording stopped")
            comp.par.label = "Start Recording"

def on_dropdown_change(comp, val):
    """Handle dropdown selection changes"""

    if comp.name == 'color_scheme':
        # Change color palette
        schemes = {
            'Classic': [(1, 0.8, 0), (0.2, 0.5, 1), (0.6, 0.2, 1)],
            'Neon': [(0, 1, 0.5), (1, 0, 1), (1, 1, 0)],
            'Pastel': [(1, 0.8, 0.9), (0.8, 0.9, 1), (0.9, 1, 0.8)],
            'Monochrome': [(1, 1, 1), (0.7, 0.7, 0.7), (0.4, 0.4, 0.4)]
        }

        # Apply to color correction
        level_top = op('/project1/data_art_system/visualization/color_correct')
        # Implement color scheme logic here

        print(f"Color scheme changed to: {val}")

def on_toggle_change(comp, val):
    """Handle toggle switches"""

    if comp.name == 'show_trails':
        feedback_top = op('/project1/data_art_system/visualization/feedback')
        feedback_top.par.mix = 0.05 if val else 0
        print(f"Trails: {'ON' if val else 'OFF'}")
```

---

## Complete Integration Example

### Master Update Script
```python
# Place this in the main project container
# This is the master script that runs every 30 seconds

import time

class DataArtSystem:
    def __init__(self):
        self.last_update = 0
        self.update_interval = 30  # seconds

    def update(self):
        """Main update loop"""
        current_time = time.time()

        if current_time - self.last_update < self.update_interval:
            return

        self.last_update = current_time

        # 1. Fetch new data
        print("[1/4] Fetching data...")
        if 'fetcher' in globals():
            current_data = fetcher.fetch_prices()

            if current_data:
                # 2. Process data
                print("[2/4] Processing data...")
                processed_data = processor.process_crypto_data(current_data, fetcher)

                # 3. Run statistical analysis
                print("[3/4] Analyzing patterns...")
                analysis_results = analyzer.analyze_complete(fetcher)

                # 4. Update visualization
                print("[4/4] Updating visualization...")
                self.update_visualization(processed_data, analysis_results)

                print(f"Update complete at {time.strftime('%H:%M:%S')}")
            else:
                print("Data fetch failed, using cached data")

    def update_visualization(self, processed, analysis):
        """Update visual parameters based on data"""

        # Update channels would happen here
        # In actual implementation, this writes to CHOPs
        pass

# Create system instance
if 'system' not in globals():
    system = DataArtSystem()

# Run update
system.update()
```

---

## Performance Optimization Tips

### Efficient Data Caching
```python
class CachedDataFetcher(CryptoDataFetcher):
    """Extended fetcher with smarter caching"""

    def __init__(self):
        super().__init__()
        self.cache_duration = 30  # seconds
        self.last_fetch_time = 0
        self.cached_result = None

    def fetch_prices(self):
        """Fetch with caching"""
        current_time = time.time()

        if (current_time - self.last_fetch_time < self.cache_duration and
            self.cached_result is not None):
            return self.cached_result

        result = super().fetch_prices()
        if result:
            self.cached_result = result
            self.last_fetch_time = current_time

        return result or self.cached_result
```

---

These code examples provide a complete foundation for your data art project. Adapt them to your specific needs and data sources!

## Next Steps

1. Copy these scripts into TouchDesigner DATs
2. Test each component individually
3. Connect them together as described in the main tutorial
4. Add your own enhancements and features

Happy coding!
