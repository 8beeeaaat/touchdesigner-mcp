# Quick Start: Data-Driven Art Portfolio Project

Get your data art project running in 30 minutes!

## Prerequisites Check

- [ ] TouchDesigner installed
- [ ] TouchDesigner MCP server configured ([guide](installation.md))
- [ ] AI assistant connected (Claude Desktop with MCP)
- [ ] Internet connection active

## 30-Minute Quick Build

### Phase 1: Setup (5 minutes)

**Step 1:** Start TouchDesigner and create a new project
- Save it as `data_pulse_art.toe`

**Step 2:** Tell your AI assistant:
```
I want to build the "Pulse of Data" project from the TouchDesigner MCP tutorial.
Create the base structure:
- Container COMP named "data_art_system" at /project1
- Three sub-containers: "data_processing", "visualization", "output"
```

**Step 3:** Verify the structure was created
- Check TouchDesigner network view
- You should see the container hierarchy

---

### Phase 2: Data Pipeline (10 minutes)

**Step 4:** Set up data fetching
```
In /project1/data_art_system/data_processing:
Create a Text DAT named "api_fetcher" with Python code that fetches
cryptocurrency prices (BTC, ETH, SOL) from CoinGecko API every 30 seconds.
Include error handling and caching.
```

**Step 5:** Test the data fetch
```
Execute the api_fetcher script and show me the current crypto prices.
Verify the data is being fetched correctly.
```

**Step 6:** Create data processing
```
Create a processing pipeline that normalizes the prices to 0-1 range
and calculates volatility. Output to CHOP channels named:
btc_price_norm, eth_price_norm, sol_price_norm, market_volatility
```

---

### Phase 3: Visual System (10 minutes)

**Step 7:** Create particle system
```
In /project1/data_art_system/visualization:
Create a GPU particle system with:
- 50,000 particles
- Colors based on crypto prices (BTC=gold, ETH=blue, SOL=purple)
- Particle count influenced by volatility
- Noise-based movement
```

**Step 8:** Add visual effects
```
Add post-processing:
- Bloom effect for glow
- Feedback for motion trails (mix 0.05)
- Composite to 1920x1080 output
```

**Step 9:** Verify visuals
- Look at TouchDesigner viewport
- You should see colorful particles moving
- Colors should be changing subtly

---

### Phase 4: Polish (5 minutes)

**Step 10:** Add time-based animation
```
Create smooth animations using Timer CHOP and Speed CHOP:
- Particles rotate slowly around center
- Noise evolves continuously over 60-second cycle
- Breathing effect on particle size (LFO at 0.5 Hz)
```

**Step 11:** Create simple UI
```
Create a Container COMP named "controls" with:
- Slider: particle_multiplier (0.1 to 3.0)
- Button: refresh_data
- Text display: current BTC price
```

---

## Quick Test Checklist

After completing all steps:

- [ ] Particles are visible and moving
- [ ] Colors are changing based on data
- [ ] API is fetching new data every 30 seconds
- [ ] UI controls work (try the slider)
- [ ] Performance is smooth (30+ FPS)

---

## Immediate Next Steps

### To Record Your Project

**Step 12:** Set up recording
```
In the output section, create a Movie File Out TOP:
- Point to final composite
- Codec: H.264
- Quality: High
- Output path: Documents/data_pulse_demo.mp4
Add a record button to the UI.
```

**Step 13:** Record a 60-second demo
- Click record
- Let it capture data changes
- Save the video for your portfolio

### To Add Statistical Analysis

**Step 14:** Add anomaly detection
```
Create statistical analysis that detects price anomalies using z-score.
When an anomaly is detected, burst the particle count to 200,000 for 2 seconds
and flash the background color.
```

---

## Troubleshooting Quick Fixes

### "API Not Responding"
```
Check the API connection by executing the api_fetcher manually.
If it fails, verify internet connection and try the backup API endpoint.
Show me the error message.
```

### "No Particles Visible"
```
Check if the particle system is cooking:
- Verify the Particle GPU SOP settings
- Check particle count > 0
- Ensure render output is connected
Show me the particle count and cook state.
```

### "Colors Not Changing"
```
Verify data flow:
- Print current values in data_channels CHOP
- Check if values are being updated
- Trace the connection from CHOP to particle color
```

### "Performance Issues"
```
Optimize the project:
- Reduce particle count to 25,000
- Lower output resolution to 1280x720
- Check cook times in performance monitor
Show me which nodes are slow.
```

---

## Expanding Your Project

### Quick Additions (Each takes 5-10 minutes)

**Add More Data Sources:**
```
Extend the API fetcher to include stock prices from Alpha Vantage API.
Map stock data to geometry deformation - higher prices = more spiky shapes.
```

**Add Sound Design:**
```
Create audio-reactive elements:
- Map volatility to audio frequency
- Trigger percussion on anomalies
- Add Audio File In CHOP with synthesized tones
```

**Interactive Camera:**
```
Add mouse interaction:
- Mouse position controls camera orbit
- Mouse click triggers particle burst
- Use Mouse In CHOP and Camera COMP
```

**Pattern Detection:**
```
Implement simple pattern recognition:
- Detect uptrends vs downtrends
- Change color palette based on trend
- Display pattern name in text overlay
```

---

## Portfolio Documentation Checklist

To make this LinkedIn-ready:

- [ ] Record 30-60 second demo video
- [ ] Take 3-5 high-quality screenshots
- [ ] Write 200-word technical description
- [ ] Document your technical stack
- [ ] List key challenges and solutions
- [ ] Prepare before/after comparisons
- [ ] Create simple architecture diagram
- [ ] Note performance metrics (FPS, particle count)

---

## LinkedIn Post Template (Ready to Use)

```
🎨 Bridging Data Science & Generative Art 🎨

I've built "The Pulse of Data" - a real-time visualization
that transforms cryptocurrency market data into living art.

🔧 Tech Stack:
→ TouchDesigner (real-time graphics)
→ Python (data processing)
→ REST APIs (live data)
→ GPU acceleration (100k particles @ 60fps)

📊 Data Science Features:
→ Real-time anomaly detection
→ Statistical analysis (z-scores, volatility)
→ Multi-source correlation
→ Predictive indicators

💡 Key Learnings:
The intersection of quantitative analysis and creative
expression opens fascinating possibilities. This project
demonstrates how data can be both informative and beautiful.

Built in 4 hours using TouchDesigner MCP + AI assistance.

#DataScience #GenerativeArt #TouchDesigner #Portfolio
#CreativeCoding #DataViz #Python

[Attach: demo video + 2 screenshots]
```

---

## Time-Saving Tips

1. **Work Incrementally**: Build one section, test, then continue
2. **Use MCP Efficiently**: Ask AI to check for errors after each phase
3. **Cache Data**: Don't re-fetch API data for every test
4. **Optimize Later**: Get it working first, optimize performance after
5. **Record Early**: Capture interesting moments as they happen
6. **Document As You Go**: Take notes about interesting findings

---

## What You'll Learn

By completing this quick-start, you'll have hands-on experience with:

- **Data Engineering**: API integration, data parsing, error handling
- **Statistical Analysis**: Normalization, volatility, anomaly detection
- **Real-time Systems**: Frame-based updates, performance optimization
- **Visual Programming**: Node-based workflows, GPU computing
- **Creative Coding**: Particle systems, procedural graphics
- **AI-Assisted Development**: Using MCP tools effectively

---

## Next Tutorial Steps

After completing this quick-start:

1. Read the [Complete Tutorial](tutorial-data-art-portfolio.md) for depth
2. Study the [Code Examples](tutorial-data-art-code-examples.md) for understanding
3. Review [MCP Commands Reference](tutorial-data-art-mcp-commands.md) for efficiency
4. Customize with your own data sources and visual style
5. Share your creation with the community!

---

## Success Metrics

A successful quick-start means you have:

- ✅ Working real-time visualization
- ✅ Live data integration
- ✅ Basic statistical processing
- ✅ 60-second demo video
- ✅ Understanding of the system architecture
- ✅ Portfolio-ready material

**Time to build:** 30 minutes
**Time to polish:** 2-4 hours
**Portfolio impact:** High

---

## Community & Support

- **Questions?** Open an issue on GitHub
- **Showcase:** Share with #TouchDesignerMCP
- **Improvements:** Contribute back to the tutorial
- **Connect:** Tag @touchdesigner on social media

---

**Remember:** The goal is to demonstrate your ability to combine technical
skills (data science, programming) with creative thinking (visual design,
interaction). This project showcases both.

Happy creating! 🚀
