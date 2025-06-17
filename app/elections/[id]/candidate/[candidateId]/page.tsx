import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Mail, User, Vote, ArrowLeft, Award } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: Promise<{ id: string; candidateId: string }>;
};

export default async function CandidatePage2(props: Props) {
  const params = await props.params
  const { id: electionId, candidateId } = params;
  const supabase = await createClient();

  // Fetch candidate details first
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candidateError || !candidate) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Candidate Not Found</h1>
        <p className="text-gray-600 mb-4">
          Could not find candidate with ID: {candidateId}
        </p>
        <p className="text-sm text-red-600 mb-4">
          Error: {candidateError?.message}
        </p>
        <Link href={`/elections/${electionId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Election
          </Button>
        </Link>
      </div>
    );
  }

  // Fetch election details separately
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select('title, description, start_date, end_date, status')
    .eq('id', candidate.election_id!!)
    .single();

  // Combine the data
  const candidateWithElection = {
    ...candidate,
    elections: election
  };

  // Get candidate's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get position color for badge
  const getPositionColor = (position: string) => {
    if (position.includes('President'))
      return 'bg-blue-100 text-blue-800 border-blue-200';
    if (position.includes('Secretary'))
      return 'bg-green-100 text-green-800 border-green-200';
    if (position.includes('Treasurer'))
      return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href={`/elections/${electionId}`}>
            <Button variant="ghost" className="gap-2 hover:bg-white/60">
              <ArrowLeft className="h-4 w-4" />
              Back to Election
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Candidate Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={candidate.photo_url || ''}
                        alt={candidate.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {getInitials(candidate.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name and Position */}
                  <div className="flex-grow">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {candidate.full_name}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={`text-sm px-3 py-1 ${getPositionColor(candidate.position)} font-medium mb-4`}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Running for {candidate.position}
                    </Badge>

                    {/* Election Info */}
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <span>
                        Election: {candidateWithElection.elections?.title}
                        {candidateWithElection.elections?.start_date &&
                          ` • ${formatDate(candidateWithElection.elections.start_date)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Bio Section */}
            {candidate.bio && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About the Candidate
                  </h2>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {candidate.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Platform & Vision */}
            {candidateWithElection.manifesto && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Vote className="h-5 w-5" />
                    Platform & Vision
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {candidateWithElection.manifesto}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Election Info & Actions */}
          <div className="space-y-6">
            {/* Election Details */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Election Information
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {candidateWithElection.elections?.title}
                  </h4>
                  {candidateWithElection.elections?.description && (
                    <p className="text-sm text-gray-600">
                      {candidateWithElection.elections.description}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  {candidateWithElection.elections?.start_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voting Starts:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.start_date)}
                      </span>
                    </div>
                  )}

                  {candidateWithElection.elections?.end_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voting Ends:</span>
                      <span className="font-medium">
                        {formatDate(candidateWithElection.elections.end_date)}
                      </span>
                    </div>
                  )}

                  {candidateWithElection.elections?.status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {candidateWithElection.elections.status.replace(
                          '_',
                          ' '
                        )}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Link
                    href={`/elections/${electionId}/vote`}
                    className="w-full"
                  >
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <Vote className="h-4 w-4 mr-2" />
                      Cast Your Vote
                    </Button>
                  </Link>

                  <Link href={`/elections/${electionId}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      View All Candidates
                    </Button>
                  </Link>

                  {/* <Button
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.share?.({
                          title: `${candidate.full_name} - Candidate Profile`,
                          text: `Check out ${candidate.full_name}'s candidacy for ${candidate.position}`,
                          url: window.location.href
                        }) ||
                          navigator.clipboard?.writeText(window.location.href);
                      }
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Share Candidate
                  </Button> */}
                </div>
              </CardContent>
            </Card>

            {/* Nomination Date */}
            {candidate.created_at && (
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Nominated on</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(candidate.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
