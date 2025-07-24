import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Service to handle automatic tournament status updates
 */
class TournamentStatusService {
  /**
   * Check and update tournament statuses
   * This function checks all upcoming tournaments and updates their status to 'live'
   * if the tournament start time has been reached
   */
  static async checkAndUpdateTournamentStatuses() {
    try {
      // Get all tournaments
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      const tournaments = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get current date and time
      const now = new Date();
      
      // Filter for upcoming tournaments that should be live
      const tournamentsToUpdate = tournaments.filter(tournament => {
        // Only check upcoming tournaments
        if (tournament.status !== 'upcoming') return false;
        
        // Check if tournament has date and time
        if (!tournament.tournamentDate || !tournament.tournamentTime) return false;
        
        // Convert tournament date and time to Date object
        const tournamentDate = tournament.tournamentDate.toDate();
        const [hours, minutes] = tournament.tournamentTime.split(':').map(Number);
        
        tournamentDate.setHours(hours, minutes, 0, 0);
        
        // Check if tournament start time has passed
        return now >= tournamentDate;
      });
      
      // Update tournaments to live status
      const updatePromises = tournamentsToUpdate.map(tournament => {
        const tournamentRef = doc(db, 'tournaments', tournament.id);
        return updateDoc(tournamentRef, { status: 'live' });
      });
      
      await Promise.all(updatePromises);
      
      return {
        success: true,
        updatedCount: tournamentsToUpdate.length
      };
    } catch (error) {
      console.error('Error updating tournament statuses:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default TournamentStatusService;