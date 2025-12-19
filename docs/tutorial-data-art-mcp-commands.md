# MCP Command Reference for Data Art Tutorial

This guide provides the exact MCP prompts and commands you'll use with your AI assistant to build the "Pulse of Data" portfolio project.

## Quick Start Commands

### Initial Setup

**Command 1: Create Base Structure**
```
Using the TouchDesigner MCP, create a base container:
- Name: "data_art_system" at path /project1
- Inside create three container COMPs: "data_processing", "visualization", and "output"
- Make sure all containers are properly connected
```

**What the AI will do:**
- Uses `create_td_node` tool to create container COMPs
- Sets up the hierarchy
- Positions nodes for visual clarity

---

### Data Processing Setup

**Command 2: API Data Fetcher**
```
In /project1/data_art_system/data_processing, create a Text DAT named "api_fetcher"
and populate it with Python code that:

1. Fetches crypto prices from CoinGecko API (free, no key needed)
2. Uses urllib or requests to make HTTP calls
3. Parses JSON response
4. Updates every 30 seconds using script execution
5. Stores: BTC price, ETH price, SOL price, timestamp
6. Calculates: price changes (%), volatility metric

Make it production-ready with error handling.
```

**Expected result:**
- Text DAT with complete Python script
- Proper error handling for network issues
- JSON parsing with validation

---

**Command 3: Data Processing Pipeline**
```
Create a data processing pipeline in /project1/data_art_system/data_processing:

1. Table DAT named "raw_data" - stores latest API response
2. Script DAT named "processor" - calculates:
   - Normalized prices (0-1 range based on 24hr min/max)
   - Rolling average over last 10 readings
   - Volatility score (standard deviation)
   - Anomaly detection (z-score > 2.5)
3. Table DAT named "processed_data" - outputs clean data table
4. CHOP named "data_channels" - converts table to channels for animation

Wire them together in sequence.
```

---

### Visualization Setup

**Command 4: Particle System**
```
In /project1/data_art_system/visualization, create a GPU particle system:

1. Create an Add SOP for particle source geometry
   - Make it a circle with 20 points

2. Create Particle GPU SOP named "main_particles"
   - Set particle count to 50000
   - Life expectancy: 3 seconds
   - Birth rate controlled by volatility

3. Create Point SOP to color particles:
   - Red channel = normalized BTC price
   - Green channel = normalized ETH price
   - Blue channel = normalized SOL price

4. Add Force SOP for turbulence:
   - Turbulence noise
   - Amplitude based on volatility metric

Wire: Add SOP → Particle GPU → Point SOP → Force SOP
```

---

**Command 5: Generative Geometry**
```
Create animated geometry in /project1/data_art_system/visualization:

1. Circle SOP named "base_shape" - radius 2
2. Noise SOP named "data_deform":
   - Period controlled by BTC price
   - Amplitude controlled by volatility
   - Animate over time using absTime.seconds
3. Point SOP named "color_map":
   - Color based on Y position (gradient)
   - Alpha based on price change (more volatile = more opaque)

This will be the emitter shape for particles.
Wire: Circle → Noise → Point → connect to Particle GPU source
```

---

**Command 6: Visual Effects Chain**
```
In /project1/data_art_system/visualization, create post-processing:

1. Render SOP to TOP - convert 3D particles to 2D image
2. Blur TOP - amount: 3 pixels
3. Bloom TOP - threshold: 0.5, size: 20
4. Feedback TOP - mix: 0.05 for trails effect
5. Edge TOP - edge detection, subtle
6. Composite TOP - combine all layers
7. Level TOP - adjust brightness and contrast based on market trend

Connect in this order for best visual result.
Set resolution to 1920x1080 throughout.
```

---

### Advanced Data Science

**Command 7: Statistical Analysis**
```
Create a Script DAT named "data_science" in data_processing that implements:

1. Moving Average Calculation:
   - Simple Moving Average (SMA) for 5, 15, 30 minute windows
   - Store in separate channels

2. Volatility Index:
   - Rolling standard deviation over 100 samples
   - Normalize to 0-1 range

3. Anomaly Detection:
   - Calculate z-score for each new price
   - Flag if abs(z-score) > 2.5
   - Store anomaly boolean in channel

4. Correlation Analysis:
   - Calculate correlation between BTC/ETH, BTC/SOL, ETH/SOL
   - Use numpy if available, otherwise manual calculation

Output all metrics to channels we can reference in visualization.
```

---

**Command 8: Anomaly Event Trigger**
```
In visualization, create an anomaly response system:

1. CHOP Execute DAT that monitors the anomaly_detected channel
2. When anomaly triggers, execute Python code that:
   - Bursts particle count to 200000 for 2 seconds
   - Flashes background color
   - Triggers a geometry transformation
   - Logs the event with timestamp

3. Create a Timer CHOP to control the burst duration
4. Create a Math CHOP to handle the particle count ramping

This creates dramatic visual responses to data events.
```

---

### Interaction and Control

**Command 9: UI Control Panel**
```
Create an interactive control panel in /project1/data_art_system:

1. Container COMP named "ui_controls"
2. Inside, create:
   - Slider COMP: "particle_multiplier" (range 0.1 to 3.0)
   - Button COMP: "refresh_data" (triggers immediate API fetch)
   - Dropdown COMP: "color_scheme" (options: Classic, Neon, Pastel, Monochrome)
   - Text COMP: "data_display" (shows current prices)
   - Toggle COMP: "show_trails" (enable/disable feedback effect)

3. Create Script DAT to handle value changes
4. Wire controls to affect visualization parameters

Make it look professional with proper layout.
```

---

**Command 10: Animation Timeline**
```
Set up time-based animation system:

1. Create Timer CHOP named "master_clock" - continuous loop, 60 second cycle
2. Create Speed CHOP to control animation speed based on volatility
3. Create LFO CHOP for breathing effect (particle size pulse)
4. Create Pattern CHOP for color rotation over time

Wire these to:
- Particle system parameters
- Geometry noise parameters
- Color shift in post-processing
- Camera rotation (optional)

This creates organic, living movement independent of data updates.
```

---

### Output and Recording

**Command 11: Render Setup**
```
In /project1/data_art_system/output:

1. Create Null TOP named "final_output" - reference to final composite
2. Create Perform TOP - forces cook every frame
3. Create Movie File Out TOP:
   - Codec: H.264
   - Quality: High
   - Resolution: 1920x1080
   - File path: $HOME/Documents/data_pulse_output.mp4

4. Add Record button to UI panel
5. Create Script that starts/stops recording on button press

Include frame counter and timestamp in corner (Text TOP).
```

---

## Advanced Prompts

### Optimization Request
```
Analyze the current TouchDesigner project and optimize for performance:
- Check cook times using performance monitor
- Suggest resolution reductions where visual quality won't suffer
- Optimize particle count vs visual impact
- Add LOD system that reduces particles when frame rate drops below 30fps
- Implement smart caching for data that doesn't need frame-rate updates
```

### Debugging Request
```
Check my data_art_system project for errors:
- Use get_td_node_errors to scan all nodes
- Identify any nodes with warnings or errors
- Check for disconnected wires
- Validate that all data channels are receiving values
- Test the API connection and show me the latest data received
```

### Extension Request
```
Add a machine learning prediction layer:
- Install scikit-learn in TouchDesigner Python
- Create a simple linear regression model
- Train on historical price data (last 100 points)
- Predict next 5 data points
- Visualize predictions as ghost particles ahead of current particles
- Use different opacity to show confidence levels
```

---

## Prompt Engineering Tips

### Be Specific About Data Flow
❌ Bad: "Make particles colorful"
✅ Good: "Map BTC price to red channel, ETH to green, SOL to blue in Point SOP color attribute"

### Reference Node Paths Clearly
❌ Bad: "In the visualization part"
✅ Good: "In /project1/data_art_system/visualization"

### Specify Numeric Ranges
❌ Bad: "Add some noise"
✅ Good: "Add Noise SOP with period 0.5, amplitude controlled by volatility channel (range 0-2)"

### Request Error Handling
❌ Bad: "Fetch the API data"
✅ Good: "Fetch API data with try/except for network errors, fallback to cached data if fetch fails, log errors to textport"

### Ask for Verification
After complex operations:
```
Verify that the particle system is working:
- Check that particles are being born
- Confirm colors are changing with data
- Show me the current values in the data_channels CHOP
- Test the anomaly detection by artificially setting a high z-score
```

---

## Example Complete Session

Here's a full example conversation flow:

**You:** "Set up the base project structure as described in step 1 of the tutorial"

**AI:** *Creates nodes using MCP* "Created data_art_system with three containers"

**You:** "Create the API fetcher in data_processing"

**AI:** *Creates Text DAT with Python code* "Created api_fetcher with CoinGecko integration"

**You:** "Test the API connection and show me what data we're getting"

**AI:** *Executes Python script* "Successfully fetched: BTC=$45,231, ETH=$2,876, SOL=$98.43"

**You:** "Now create the processing pipeline to normalize this data"

**AI:** *Creates Table DATs and Script DAT* "Created pipeline, normalized values are: BTC=0.73, ETH=0.54, SOL=0.38"

**You:** "Build the particle system that uses these values for color"

**AI:** *Creates SOP chain* "Particle system created, particles now colored based on crypto values"

**You:** "Add the visual effects chain"

**AI:** *Creates TOP network* "Post-processing complete, bloom and trails active"

**You:** "Show me the full project structure"

**AI:** *Uses get_td_nodes to list hierarchy* "Here's your complete node tree..."

---

## Troubleshooting Commands

### When Something Doesn't Work

**Network Check:**
```
Test the API connection by executing the api_fetcher script manually.
Show me any error messages. If it fails, check internet connection and
API endpoint status. Print the full HTTP response.
```

**Visual Debug:**
```
Check if particles are rendering:
- Add a Geo COMP to view the particle SOP directly
- Create a debug Text TOP that shows particle count
- Verify the Render SOP is cooking every frame
- Check if GPU memory is sufficient (show me stats)
```

**Data Pipeline Debug:**
```
Trace the data flow from API to visualization:
1. Print raw API response
2. Show processed_data table contents
3. Display data_channels CHOP values
4. Verify these values reach the particle system
Identify where the chain breaks.
```

---

## Quick Reference: MCP Tools Used

| Tool | Purpose in This Project |
|------|------------------------|
| `create_td_node` | Create all nodes (COMPs, DATs, SOPs, TOPs, CHOPs) |
| `get_td_nodes` | Check project structure |
| `update_td_node_parameters` | Adjust particle count, colors, effects |
| `execute_python_script` | Run data processing, test API |
| `get_td_node_errors` | Debug issues |
| `get_td_node_parameters` | Check current settings |

---

## Pro Tips

1. **Work Incrementally**: Build one section at a time, test, then move on
2. **Use Null Nodes**: Add Null TOPs/SOPs as reference points for complex networks
3. **Name Everything**: Clear names make MCP commands much easier
4. **Comment Complex Logic**: Add Text DATs with notes for future reference
5. **Save Often**: TouchDesigner projects can be complex - save after each major step
6. **Test with Fake Data First**: Before connecting to API, test with random values
7. **Monitor Performance**: Keep Performance Monitor open, watch cook times
8. **Use Containers**: Group related nodes in Container COMPs for organization

---

Happy creating! This project will showcase your skills in data engineering, statistical analysis, real-time graphics, and creative problem-solving.
