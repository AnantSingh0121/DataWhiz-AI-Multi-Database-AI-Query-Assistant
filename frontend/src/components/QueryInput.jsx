import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Database, Table } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function QueryInput({ onQuerySubmit, onExecuteResults, onViewSchema }) {
  const [query, setQuery] = useState("");
  const [dbType, setDbType] = useState("sql");
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");

  useEffect(() => {
    fetchTables();
    fetchCollections();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data.tables || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await axios.get(`${API}/collections`);
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setLoading(true);
    try {
      const convertResponse = await axios.post(`${API}/convert-query`, {
        query: query,
        db_type: dbType,
        collection_name: selectedTable
      });

      onQuerySubmit(convertResponse.data);
      const executeResponse = await axios.post(`${API}/execute-query`, {
        query: convertResponse.data.generated_query,
        db_type: dbType,
        collection_name: selectedTable
      });

      onExecuteResults(executeResponse.data);
      toast.success("Query executed successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.detail || "Failed to execute query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-heading text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Query Builder
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Convert natural language to database queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 font-body mb-2 block">
              Database Type
            </label>
            <Select data-testid="db-type-select" value={dbType} onValueChange={setDbType}>
              <SelectTrigger className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200">
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="sql">SQL (MySQL)</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 font-body mb-2 block">
              {dbType === "sql" ? "Table" : "Collection"}
            </label>
            <Select data-testid="table-select" value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200">
                <SelectValue placeholder={`Select ${dbType === "sql" ? "table" : "collection"}`} />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {dbType === "sql" ? (
                  tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))
                ) : (
                  collections.map((collection) => (
                    <SelectItem key={collection} value={collection}>
                      {collection}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
{selectedTable && (
  <Button
    variant="ghost"
    size="sm"
    className="btn-ghost-clean mt-2 text-xs text-accent hover:text-accent/80"
    data-testid="view-schema-btn"
    onClick={() => onViewSchema(dbType, selectedTable)}
  >
    <Table className="w-3 h-3 mr-1" />
    View Schema & Sample Data
  </Button>
)}

          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 font-body mb-2 block">
              Natural Language Query
            </label>
            <Textarea
              data-testid="query-input"
              placeholder="E.g., Show all customers from India"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-slate-600 text-slate-200 font-mono min-h-[120px]"
            />
          </div>
          <Button
            data-testid="submit-query-btn"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] transition-all duration-300 font-semibold tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Generate & Execute Query
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-heading text-white">Example Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge
              data-testid="example-query-1"
              className="bg-primary/10 text-primary border border-primary/20 font-mono text-xs cursor-pointer hover:bg-primary/20"
              onClick={() => {
                setQuery("Show all customers from India");
                setDbType("sql");
              }}
            >
              Show all customers from India
            </Badge>
            <Badge
              data-testid="example-query-2"
              className="bg-primary/10 text-primary border border-primary/20 font-mono text-xs cursor-pointer hover:bg-primary/20"
              onClick={() => {
                setQuery("Top 5 products by price");
                setDbType("sql");
              }}
            >
              Top 5 products by price
            </Badge>
            <Badge
              data-testid="example-query-3"
              className="bg-secondary/10 text-secondary border border-secondary/20 font-mono text-xs cursor-pointer hover:bg-secondary/20"
              onClick={() => {
                setQuery("Get all users aged > 30");
                setDbType("mongodb");
              }}
            >
              Get all users aged &gt; 30
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}