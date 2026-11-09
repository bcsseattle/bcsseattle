'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ELECTION_TYPE_CONFIGS, 
  getElectionTypeDefaults, 
  supportsUnopposedCandidates,
  getElectionTypeDescription,
  getTypicalElectionDuration
} from '@/utils/election-types';
import { ElectionType } from '@/types';
import { Crown, Building, Vote, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function TestElectionTypesPage() {
  const [selectedType, setSelectedType] = useState<ElectionType>('leadership');
  
  const typeConfig = ELECTION_TYPE_CONFIGS[selectedType];
  const typeDefaults = getElectionTypeDefaults(selectedType);
  const supportsUnopposed = supportsUnopposedCandidates(selectedType);
  const description = getElectionTypeDescription(selectedType);
  const typicalDuration = getTypicalElectionDuration(selectedType);

  const getTypeIcon = (type: ElectionType) => {
    switch (type) {
      case 'leadership':
        return Crown;
      case 'board':
        return Building;
      case 'initiative':
        return Vote;
      default:
        return Users;
    }
  };

  const TypeIcon = getTypeIcon(selectedType);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Election Type Configuration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the type-aware election configuration system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Election Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ElectionType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an election type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leadership">Leadership Election</SelectItem>
              <SelectItem value="initiative">Initiative Election</SelectItem>
              <SelectItem value="board">Board Election</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5" />
              {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Election
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
              <p className="text-sm">{description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Typical Duration: {typicalDuration} days</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={supportsUnopposed ? "default" : "secondary"}>
                {supportsUnopposed ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Unopposed Candidates
              </Badge>
              <Badge variant={typeConfig.defaultSeparateVotingPeriods ? "default" : "secondary"}>
                {typeConfig.defaultSeparateVotingPeriods ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Separate Voting Periods
              </Badge>
              <Badge variant={typeConfig.defaultShowUnopposedStatus ? "default" : "secondary"}>
                {typeConfig.defaultShowUnopposedStatus ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Show Unopposed Status
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Separate Voting Periods</span>
                <Badge variant={typeDefaults.enable_separate_voting_periods ? "default" : "secondary"}>
                  {typeDefaults.enable_separate_voting_periods ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Show Unopposed Status</span>
                <Badge variant={typeDefaults.show_unopposed_status ? "default" : "secondary"}>
                  {typeDefaults.show_unopposed_status ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Allows Unopposed</span>
                <Badge variant={supportsUnopposed ? "default" : "secondary"}>
                  {supportsUnopposed ? "Yes" : "No"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Typical Duration</span>
                <Badge variant="outline">
                  {typicalDuration} days
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type-Specific Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(ELECTION_TYPE_CONFIGS).map(([type, config]) => {
              const Icon = getTypeIcon(type as ElectionType);
              const isSelected = type === selectedType;
              
              return (
                <div 
                  key={type}
                  className={`p-4 border rounded-lg transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5" />
                    <h4 className="font-medium capitalize">{type}</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{config.typicalDurationDays}d</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Separate Periods:</span>
                      <span>{config.defaultSeparateVotingPeriods ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unopposed:</span>
                      <span>{config.allowsUnopposedCandidates ? '✓' : '✗'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Configuration Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded text-sm font-mono">
            <div className="space-y-1">
              <div>// Configure {selectedType} election</div>
              <div>await configureElectionByType(electionId, '{selectedType}');</div>
              <div></div>
              <div>// Get type-aware defaults</div>
              <div>const defaults = getElectionTypeDefaults('{selectedType}');</div>
              <div>// Returns: {JSON.stringify(typeDefaults, null, 2)}</div>
              <div></div>
              <div>// Check if type supports unopposed candidates</div>
              <div>const supportsUnopposed = supportsUnopposedCandidates('{selectedType}');</div>
              <div>// Returns: {supportsUnopposed.toString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
