import { useState, useRef, useEffect } from "react";
import { Sparkles, Brain, Lightbulb, TrendingUp, Loader2, Send, Bot, User, MessageSquare, Trash2 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import "./aianalysis.css";
import { toast } from "../ui/toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ChatMessage = ({ msg }) => {
  const renderContent = () => {
    try {
      // Check if content contains a JSON chart definition
      const jsonMatch = msg.content.match(/```json\n([\s\S]*?)\n```/) || msg.content.match(/\{[\s\S]*"chartType"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const data = JSON.parse(jsonString);
        
        if (data.chartType && data.chartData) {
          const textBefore = msg.content.split(jsonMatch[0])[0];
          const textAfter = msg.content.split(jsonMatch[0])[1];

          const chartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  boxWidth: 12,
                  font: { size: 10 }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                displayColors: true
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: 10 } }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
              }
            }
          };

          return (
            <div className="msg-chart-wrapper">
              {textBefore && <div className="msg-text-part">{textBefore}</div>}
              <div className="chat-chart-card">
                <div className="chat-chart-container" style={{ height: '280px', padding: '15px' }}>
                  {data.chartType === 'bar' ? (
                    <Bar data={data.chartData} options={chartOptions} />
                  ) : (
                    <Line data={data.chartData} options={chartOptions} />
                  )}
                </div>
              </div>
              {textAfter && <div className="msg-text-part">{textAfter}</div>}
            </div>
          );
        }
      }
    } catch (e) {
      console.error("Failed to parse chart data", e);
    }
    return <div className="msg-content">{msg.content}</div>;
  };

  return (
    <div className={`msg-wrapper ${msg.role}`}>
      <div className="msg-avatar">
        {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div className={`msg-bubble ${msg.role}`}>
        {renderContent()}
      </div>
    </div>
  );
};

const AIAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm an AI assistant powered by OpenAI's GPT-4o model. I've loaded your sales data context. You can ask me to analyze specific trends, compare categories, or explain anomalies in your data." }
  ]);
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [dataContext, setDataContext] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load data context for both automated analysis and chat
    const loadData = async () => {
      try {
        const response = await fetch("/api/salesdata");
        const json = await response.json();
        if (json.data && json.data.length > 0) {
          setDataContext(json.data);
        }
      } catch (e) {
        console.error("Failed to load data context", e);
      }
    };
    loadData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const dataResponse = await fetch("/api/salesdata");
      const dataJson = await dataResponse.json();
      
      if (!dataJson.data || dataJson.data.length === 0) {
        toast("No data available for analysis. Please import data first.", "error");
        setLoading(false);
        return;
      }

      const df_total = dataJson.data;
      const prompt = `
        Automated Data Analysis Report Request:
        Analyze the ENTIRE imported dataset provided below:
        ${JSON.stringify(df_total, null, 2)}
        
        Tasks:
        1. 5 Detailed Key Insights from this specific data.
        2. 3 Strategic Insights for future business growth based on trends found in these dates.
        3. Identification of any potential anomalies or patterns.
        
        Format the response as a clear JSON object with keys: 'insights', 'ideas', 'trends'. Each value should be an array of strings.
      `;

      if (typeof puter === 'undefined') {
          toast("Puter.js not loaded. Please refresh the page.", "error");
          setLoading(false);
          return;
      }

      const response = await puter.ai.chat(prompt, { model: "gpt-4o" });

      let content = "";
      if (typeof response === 'string') {
          content = response;
      } else if (response?.message?.content) {
          content = response.message.content;
      } else if (response?.text) {
          content = response.text;
      } else {
          content = JSON.stringify(response);
      }
      
      let analysisData;
      try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : content;
          analysisData = JSON.parse(jsonString);
      } catch (e) {
          analysisData = {
              insights: content.split('\n').filter(line => line.trim().length > 10).slice(0, 5),
              ideas: ["Review data for potential optimizations"],
              trends: ["Upward momentum in recent periods"]
          };
      }
      
      setAnalysis(analysisData);
      toast("Analysis complete!", "success");
    } catch (error) {
      console.error("AI analysis error:", error);
      toast("Error during AI analysis.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsChatLoading(true);

    try {
      if (typeof puter === 'undefined') {
          toast("Puter.js not loaded.", "error");
          setIsChatLoading(false);
          return;
      }

      let contextualPrompt = input;
      if (dataContext) {
        contextualPrompt = `
          The user is asking a question about their business data.
          Here is a sample of their current dataset:
          ${JSON.stringify(dataContext, null, 2)}
          
          User Question: "${input}"
          
          Please analyze the data and answer the user's question directly based on the provided dataset.
          
          IF the user's question would be better answered with a visualization (like a trend or comparison), 
          include a JSON block in your response using this format:
          
          \`\`\`json
          {
            "chartType": "bar" | "line",
            "chartData": {
              "labels": ["Label 1", "Label 2", ...],
              "datasets": [
                {
                  "label": "Dataset Name",
                  "data": [10, 20, ...],
                  "backgroundColor": "rgba(75, 192, 192, 0.6)",
                  "borderColor": "rgba(75, 192, 192, 1)"
                }
              ]
            }
          }
          \`\`\`
          
          Provide a helpful text explanation alongside the chart.
        `;
      }

      const response = await puter.ai.chat(contextualPrompt, { model: "gpt-4o" });

      let content = "";
      if (typeof response === 'string') {
          content = response;
      } else if (response?.message?.content) {
          content = response.message.content;
      } else {
          content = JSON.stringify(response);
      }

      setMessages(prev => [...prev, { role: "assistant", content }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast("Failed to get response from AI.", "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared. How else can I help?" }]);
  };

  return (
    <div className="ai-analysis-container">
      <header className="page-header">
        <div className="header-content">
          <Sparkles className="header-icon" />
          <h1>AI Data Insights & Assistant</h1>
        </div>
        <p className="header-subtitle">
          Generate automated insights or chat with the AI about your data patterns.
        </p>
      </header>

      <div className="ai-layout-grid">
        <div className="automated-analysis-section">
          <div className="section-header">
            <Brain className="section-icon" />
            <h2>Automated Analysis</h2>
          </div>
          
          <div className="action-section">
            <button 
              onClick={runAnalysis} 
              disabled={loading}
              className="analyze-button"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles />
                  Generate Report
                </>
              )}
            </button>
          </div>

          {analysis ? (
            <div className="analysis-results">
              <div className="result-card">
                <div className="card-header">
                  <Lightbulb className="card-icon text-yellow-500" />
                  <h3>Key Insights</h3>
                </div>
                <ul className="insight-list">
                  {analysis.insights?.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div className="result-card">
                <div className="card-header">
                  <TrendingUp className="card-icon text-green-500" />
                  <h3>Strategic Ideas</h3>
                </div>
                <ul className="idea-list">
                  {analysis.ideas?.map((idea, i) => (
                    <li key={i}>{idea}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : !loading && (
            <div className="analysis-placeholder">
              <p>Click "Generate Report" to start automated data scanning.</p>
            </div>
          )}
        </div>

        <div className="chat-section-embedded">
          <div className="section-header">
            <MessageSquare className="section-icon" />
            <h2>Data Assistant</h2>
            <button onClick={clearChat} className="clear-chat-btn" title="Clear Chat">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="chat-window">
            <div className="chat-messages-container">
              {messages.map((msg, index) => (
                <ChatMessage key={index} msg={msg} />
              ))}
              {isChatLoading && (
                <div className="msg-wrapper assistant">
                  <div className="msg-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="msg-bubble assistant loading">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleChatSend}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                disabled={isChatLoading}
              />
              <button type="submit" disabled={isChatLoading || !input.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis;
