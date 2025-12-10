import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Database, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import SchemaPreview from "./SchemaPreview"; 

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DatabaseInsights({ onViewSchema }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => { fetchInsights(); }, []);

  const fetchInsights = async () => {
    try {
      const response = await axios.get(`${API}/insights`);
      setInsights(response.data);
    } catch (e) {
      console.error("Error fetching insights:", e);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="p-4">
        <Card className="bg-card/40 backdrop-blur-md border border-white/5 rounded-xl">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Loading insights...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Card data-testid="common-queries-card" className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Common Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights?.common_queries?.length > 0 ? (
            insights.common_queries.map((query, idx) => (
              <div
                key={idx}
                data-testid={`common-query-${idx}`}
                className="text-xs text-slate-400 p-2 bg-black/20 rounded border border-white/5 hover:border-primary/30 transition-colors cursor-pointer"
              >
                {query}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No queries yet</p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="frequent-tables-card" className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-secondary" />
            Frequent Tables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights?.frequent_tables?.length > 0 &&
            insights.frequent_tables.map((table, idx) => (
              <div
                key={idx}
                data-testid={`frequent-table-${idx}`}
                className="flex items-center justify-between p-2 bg-black/20 rounded border border-white/5 hover:border-secondary/30 transition-colors group"
              >
                <span className="text-xs text-slate-300 font-mono">{table.name}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-secondary/10 text-secondary border-0 text-xs">{table.count}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onViewSchema(table.db_type || "sql", table.name)}

                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
