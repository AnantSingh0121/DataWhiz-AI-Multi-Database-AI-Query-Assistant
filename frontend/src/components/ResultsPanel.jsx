import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, BarChart3, Table as TableIcon, Lightbulb, Code } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ResultsPanel({ queryResponse, executeResponse }) {
  const [activeTab, setActiveTab] = useState("table");

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const exportToCSV = () => {
    if (!executeResponse?.results || executeResponse.results.length === 0) {
      toast.error("No data to export");
      return;
    }
const validateQueryColumns = (query, schema) => {
  if (!query || !schema) return { valid: true };

  const lowerQuery = query.toLowerCase();

  for (const tableObj of schema) {
    for (const col of tableObj.columns) {
      if (lowerQuery.includes(col.toLowerCase())) {
        return { valid: true };
      }
    }
  }
  return { 
    valid: false, 
    message: "Generated query references a column not in your schema. Fix schema or regenerate query."
  };
};

    const headers = Object.keys(executeResponse.results[0]);
    const csvContent = [
      headers.join(","),
      ...executeResponse.results.map(row => 
        headers.map(header => JSON.stringify(row[header] || "")).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_results.csv";
    a.click();
    toast.success("CSV exported successfully!");
  };

  const detectNumericColumns = () => {
    if (!executeResponse?.results || executeResponse.results.length === 0) return [];
    const firstRow = executeResponse.results[0];
    return Object.keys(firstRow).filter(key => typeof firstRow[key] === 'number');
  };

  const prepareChartData = () => {
    if (!executeResponse?.results) return [];
    return executeResponse.results.slice(0, 10); 
  };

  if (!queryResponse && !executeResponse) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-xl font-heading text-white/70 mb-2">No Query Yet</h3>
          <p className="text-muted-foreground text-sm">
            Enter a natural language query to see results here
          </p>
        </div>
      </div>
    );
  }

  let validation = null;

if (queryResponse?.generated_query && queryResponse?.schema) {
  validation = validateQueryColumns(
    queryResponse.generated_query,
    queryResponse.schema
  );
}

if (validation && !validation.valid) {
  return (
    <Card className="bg-destructive/10 border border-destructive/20 rounded-xl m-4">
      <CardHeader>
        <CardTitle className="text-lg font-heading text-destructive">
          Invalid Query
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-destructive/80">
          {validation.message}
        </p>
        <p className="text-xs text-destructive/60 mt-2">
          Example: Query references a column that doesn't exist in your schema.
        </p>
      </CardContent>
    </Card>
  );
}
  return (
    <div className="space-y-4 p-4">
      {queryResponse && (

        <Card data-testid="generated-query-card" className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-heading text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-accent" />
                Generated Query
              </CardTitle>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-mono text-xs uppercase">
                {queryResponse.db_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-black/30 p-4 rounded-lg border border-white/5 relative group">
              <pre className="text-sm text-cyan-400 font-mono overflow-x-auto">
                {queryResponse.generated_query}
              </pre>
              <Button
                data-testid="copy-query-btn"
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(queryResponse.generated_query)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
{queryResponse && (
  <Card className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl">
    <CardHeader>
      <CardTitle className="text-lg font-heading text-white flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        Explanation
      </CardTitle>
    </CardHeader>

    <CardContent>
      <p className="text-slate-300 text-sm leading-relaxed">
        {queryResponse.explanation
          ?.replace(/\*\*/g, "")        
          .replace(/`/g, "")           
          .replace(/#+/g, "")          
          .trim()}
      </p>
    </CardContent>
  </Card>
)}

      {queryResponse && (
  <Card className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl">
    <CardHeader>
      <CardTitle className="text-lg font-heading text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-green-400" />
        Optimization Tips
      </CardTitle>
    </CardHeader>

    <CardContent>
      <div className="text-slate-300 text-sm leading-relaxed space-y-2">
        {queryResponse.optimization_tips
          ?.replace(/\*\*/g, "")           
          .replace(/^Optimization Tips:?/i, "")
          .split("\n")                   
          .filter(line => line.trim() !== "") 
          .map((line, idx) => (
            <p key={idx}>{line.trim()}</p>
          ))}
      </div>
    </CardContent>
  </Card>
)}

      {executeResponse && executeResponse.success && (
        <Card data-testid="results-card" className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-heading text-white">Query Results</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-1">
                  {executeResponse.row_count} row{executeResponse.row_count !== 1 ? 's' : ''} returned
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  data-testid="export-csv-btn"
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5"
                  onClick={exportToCSV}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-black/30 border-white/10">
                <TabsTrigger value="table" data-testid="table-tab">
                  <TableIcon className="w-4 h-4 mr-1" />
                  Table
                </TabsTrigger>
                {detectNumericColumns().length > 0 && (
                  <TabsTrigger value="chart" data-testid="chart-tab">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Chart
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="table" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        {executeResponse.results.length > 0 &&
                          Object.keys(executeResponse.results[0]).map((key) => (
                            <th
                              key={key}
                              className="text-left p-3 text-xs font-bold uppercase tracking-widest text-slate-500 font-body"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {executeResponse.results.map((row, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          {Object.values(row).map((value, vidx) => (
                            <td key={vidx} className="p-3 text-sm text-slate-300 font-mono">
                              {value !== null ? String(value) : "null"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {detectNumericColumns().length > 0 && (
                <TabsContent value="chart" className="mt-4">
                  <div className="space-y-6">
                    {detectNumericColumns().map((col) => (
                      <div key={col}>
                        <h4 className="text-sm font-bold text-white mb-3 font-heading">{col}</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={prepareChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis 
                              dataKey={Object.keys(executeResponse.results[0])[0]} 
                              stroke="rgba(255,255,255,0.5)"
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis 
                              stroke="rgba(255,255,255,0.5)"
                              style={{ fontSize: '12px' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(235, 25%, 11%)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Bar dataKey={col} fill="hsl(217, 91%, 60%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {executeResponse && !executeResponse.success && (
        <Card className="bg-destructive/10 border border-destructive/20 rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-heading text-destructive">Query Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/80">{executeResponse.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}