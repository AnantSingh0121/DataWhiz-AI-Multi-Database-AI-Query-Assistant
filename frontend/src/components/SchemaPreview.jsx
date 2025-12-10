import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Table, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SchemaPreview({ dbType, name, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeDb = (dbType || "sql").toLowerCase();

  useEffect(() => {
    if (!dbType || !name) return;
    fetchSchema();
  }, [dbType, name]);

  const fetchSchema = async () => {
    try {
      const type = ["sql", "mongodb"].includes(safeDb) ? safeDb : "sql";
      const response = await axios.get(`${API}/schema/${type}/${name}`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching schema:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
   <div
  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  onClick={onClose} 
>

      <Card className="bg-card border border-white/10 shadow-2xl rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {safeDb === "sql" ? (
                <Table className="w-6 h-6 text-primary" />
              ) : (
                <Database className="w-6 h-6 text-secondary" />
              )}
              <div>
                <CardTitle className="text-xl font-heading text-white">{name}</CardTitle>
                <Badge className="mt-1 bg-primary/10 text-primary border border-primary/20 font-mono text-xs uppercase">
                  {dbType}
                </Badge>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="hover:bg-white/5">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <p className="text-muted-foreground">Loading schema...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading text-white mb-3">Schema Structure</h3>
                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                  {safeDb === "sql" && data?.schema_info?.columns ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-2 text-xs font-bold uppercase tracking-widest text-slate-500">Column</th>
                          <th className="text-left p-2 text-xs font-bold uppercase tracking-widest text-slate-500">Type</th>
                          <th className="text-left p-2 text-xs font-bold uppercase tracking-widest text-slate-500">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.schema_info.columns.map((col, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="p-2 text-sm text-cyan-400 font-mono">{col.name}</td>
                            <td className="p-2 text-sm text-slate-300">{col.type}</td>
                            <td className="p-2 text-sm text-slate-300">{col.nullable ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="space-y-2">
                      {data?.schema_info?.fields?.map((field, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded border border-white/5">
                          <span className="text-sm text-cyan-400 font-mono">{field.name}</span>
                          <span className="text-sm text-slate-400">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-heading text-white mb-3">Sample Data</h3>
                <div className="overflow-x-auto bg-black/30 p-4 rounded-lg border border-white/5">
                  {data?.sample_data?.length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          {Object.keys(data.sample_data[0]).map((key) => (
                            <th key={key} className="text-left p-2 text-xs font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.sample_data.map((row, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            {Object.values(row).map((value, vidx) => (
                              <td key={vidx} className="p-2 text-sm text-slate-300 font-mono whitespace-nowrap">
                                {value !== null ? String(value) : "null"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No sample data available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
