import { AlertCircle, Database, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DatabaseMigrationRequired() {
  const handleOpenSupabase = () => {
    window.open('https://gjbrnuunyllvbmibbdmi.supabase.co/project/gjbrnuunyllvbmibbdmi/sql', '_blank');
  };

  const handleOpenInstructions = () => {
    window.open('/RUN_MIGRATION_NOW.md', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-red-600" />
            <div>
              <CardTitle className="text-2xl text-red-600">Database Setup Required</CardTitle>
              <CardDescription>
                The database tables haven&apos;t been created yet
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Migration Not Run</AlertTitle>
            <AlertDescription>
              The database tables (donors, ngos, food_items, requests) don&apos;t exist yet.
              You need to run the migration to create them.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Quick Setup (2 minutes):</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <div>
                  <p className="font-medium">Open Supabase SQL Editor</p>
                  <Button 
                    onClick={handleOpenSupabase}
                    className="mt-2"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open SQL Editor
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <div>
                  <p className="font-medium">Copy the migration SQL</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Open <code className="bg-gray-200 px-1 rounded">supabase/migrations/001_initial_schema.sql</code>
                  </p>
                  <p className="text-sm text-gray-600">
                    Copy ALL contents (Ctrl+A, Ctrl+C)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <div>
                  <p className="font-medium">Run the migration</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Paste into SQL Editor and click <strong>&quot;Run&quot;</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </span>
                <div>
                  <p className="font-medium">Restart the app</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Stop the dev server (Ctrl+C) and run <code className="bg-gray-200 px-1 rounded">npm run dev</code> again
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={handleOpenInstructions}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Detailed Instructions
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">What will be created:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>✅ <code>donors</code> table - Store donor information</li>
              <li>✅ <code>ngos</code> table - Store NGO/receiver information</li>
              <li>✅ <code>food_items</code> table - Store food donations</li>
              <li>✅ <code>requests</code> table - Store food requirements</li>
              <li>✅ <code>transactions</code> table - Store donation transactions</li>
              <li>✅ <code>feedback</code> table - Store user feedback</li>
              <li>✅ Indexes, triggers, and stored procedures</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
