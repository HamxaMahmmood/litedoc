'use client';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MoEArchitecture3D from '@/components/visualizations/MoEArchitecture3D';
import ModelStats from '@/components/visualizations/ModelStats';
import ExpertRetentionChart from '@/components/visualizations/ExpertRetentionChart';
import { ModelConfig } from '@/types/model';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [baselineData, setBaselineData] = useState<ModelConfig | null>(null);
  const [pruned40Data, setPruned40Data] = useState<ModelConfig | null>(null);
  const [pruned80Data, setPruned80Data] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [baseline, pruned40, pruned80] = await Promise.all([
          fetch('/data/baseline.json').then(res => res.json()),
          fetch('/data/pruned40.json').then(res => res.json()),
          fetch('/data/pruned80.json').then(res => res.json()),
        ]);

        setBaselineData(baseline);
        setPruned40Data(pruned40);
        setPruned80Data(pruned80);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          LiteDoc Visualization
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Interactive MoE Expert Pruning & Token Routing
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
          3D Architecture Visualization with Real-time Inference Flow
        </p>
        
        {/* Add this button */}
        <div className="mt-6">
          <Link href="/chat">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 text-lg">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat with LiteDoc
            </Button>
          </Link>
        </div>
      </div>
        

        <Tabs defaultValue="baseline" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <TabsTrigger 
              value="baseline"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Baseline (0%)
            </TabsTrigger>
            <TabsTrigger 
              value="pruned40"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              40% Pruned
            </TabsTrigger>
            <TabsTrigger 
              value="pruned80"
              className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"
            >
              80% Pruned
            </TabsTrigger>
          </TabsList>

          {/* Baseline Tab */}
          <TabsContent value="baseline" className="space-y-6">
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950 dark:to-slate-900">
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  {baselineData?.name}
                </CardTitle>
                <CardDescription>
                  Full model with 64 experts per layer • 3.37B parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {baselineData && (
                  <>
                    <ModelStats modelData={baselineData} />
                    
                    {/* Full Width 3D Visualization */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                        3D Architecture & Token Routing
                      </h3>
                      <MoEArchitecture3D modelData={baselineData} />
                    </div>

                    {/* Full Width Chart */}
                    <ExpertRetentionChart modelData={baselineData} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 40% Pruned Tab */}
          <TabsContent value="pruned40" className="space-y-6">
            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
                <CardTitle className="text-purple-900 dark:text-purple-100">
                  {pruned40Data?.name}
                </CardTitle>
                <CardDescription>
                  ~38 experts per layer • 2.4B parameters • 1.4× compression
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {pruned40Data && (
                  <>
                    <ModelStats modelData={pruned40Data} />
                    
                    {/* Full Width 3D Visualization */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                        3D Architecture & Token Routing
                      </h3>
                      <MoEArchitecture3D modelData={pruned40Data} />
                    </div>

                    {/* Full Width Chart */}
                    <ExpertRetentionChart modelData={pruned40Data} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 80% Pruned Tab */}
          <TabsContent value="pruned80" className="space-y-6">
            <Card className="border-2 border-pink-200 dark:border-pink-800">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-white dark:from-pink-950 dark:to-slate-900">
                <CardTitle className="text-pink-900 dark:text-pink-100">
                  {pruned80Data?.name}
                </CardTitle>
                <CardDescription>
                  ~13 experts per layer • 1.4B parameters • 2.4× compression
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {pruned80Data && (
                  <>
                    <ModelStats modelData={pruned80Data} />
                    
                    {/* Full Width 3D Visualization */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                        3D Architecture & Token Routing
                      </h3>
                      <MoEArchitecture3D modelData={pruned80Data} />
                    </div>

                    {/* Full Width Chart */}
                    <ExpertRetentionChart modelData={pruned80Data} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-600">
          <p>LiteDoc: Distilling Large Document Models into Efficient Task-Specific Encoders</p>
          <p className="mt-1">ICDAR 2026 Submission</p>
        </div>
      </div>
    </main>
  );
}