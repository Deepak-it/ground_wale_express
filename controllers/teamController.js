const Team = require('../models/Team');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || '';
}

function serializeTeam(team) {
  const data = team.toObject ? team.toObject() : team;
  const players = Array.isArray(data.players) ? data.players : [];
  return {
    ...data,
    playerCount: players.length,
    appUsersCount: players.filter((player) => !player.isGuest).length,
    guestPlayersCount: players.filter((player) => player.isGuest).length,
  };
}

async function findTeamOrThrow(ownerId, teamId) {
  const team = await Team.findOne({ _id: teamId, ownerId });
  if (!team) {
    throw httpError(404, 'Team not found');
  }
  return team;
}

exports.listTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ ownerId: req.params.ownerId }).sort({ createdAt: -1 });
  res.json(teams.map(serializeTeam));
});

exports.createTeam = asyncHandler(async (req, res) => {
  const name = normalizeText(req.body.name);
  if (!name) {
    throw httpError(400, 'Team name is required');
  }

  const team = await Team.create({
    ownerId: req.params.ownerId,
    name,
  });
  res.status(201).json(serializeTeam(team));
});

exports.getTeam = asyncHandler(async (req, res) => {
  const team = await findTeamOrThrow(req.params.ownerId, req.params.teamId);
  res.json(serializeTeam(team));
});

exports.updateTeam = asyncHandler(async (req, res) => {
  const update = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const name = normalizeText(req.body.name);
    if (!name) {
      throw httpError(400, 'Team name is required');
    }
    update.name = name;
  }

  const team = await Team.findOneAndUpdate(
    { _id: req.params.teamId, ownerId: req.params.ownerId },
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!team) {
    throw httpError(404, 'Team not found');
  }

  res.json(serializeTeam(team));
});

exports.deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOneAndDelete({
    _id: req.params.teamId,
    ownerId: req.params.ownerId,
  });

  if (!team) {
    throw httpError(404, 'Team not found');
  }

  res.json({ deleted: true, teamId: req.params.teamId });
});

exports.searchPlayerDirectory = asyncHandler(async (req, res) => {
  const query = normalizeText(req.query.query || req.query.search);
  const filters = { role: 'player' };
  if (query) {
    filters.$or = [
      { ownerName: { $regex: query, $options: 'i' } },
      { contactNumber: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ];
  }

  const users = await User.find(filters)
    .select('ownerName contactNumber email sportsNeoRole')
    .limit(20)
    .lean();

  res.json(
    users.map((user) => ({
      id: user._id,
      name: user.ownerName,
      contactNumber: user.contactNumber || '',
      email: user.email || '',
      playerType: user.sportsNeoRole || '',
      isGuest: false,
    })),
  );
});

exports.addPlayer = asyncHandler(async (req, res) => {
  const team = await findTeamOrThrow(req.params.ownerId, req.params.teamId);

  let player;
  const userId = normalizeText(req.body.userId);
  if (userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw httpError(404, 'Player not found');
    }

    player = {
      userId: user._id,
      name: normalizeText(user.ownerName),
      contactNumber: normalizeText(user.contactNumber),
      email: normalizeEmail(user.email),
      playerType: normalizeText(req.body.playerType || user.sportsNeoRole),
      isGuest: false,
    };
  } else {
    const name = normalizeText(req.body.name);
    const contactNumber = normalizeText(req.body.contactNumber);
    if (!name || !contactNumber) {
      throw httpError(400, 'name and contactNumber are required');
    }

    player = {
      name,
      contactNumber,
      email: normalizeEmail(req.body.email),
      playerType: normalizeText(req.body.playerType),
      isGuest: req.body.isGuest !== false,
    };
  }

  const duplicate = team.players.some((existing) => {
    if (player.userId && existing.userId) {
      return existing.userId.toString() === player.userId.toString();
    }
    return (
      normalizeText(existing.contactNumber) &&
      normalizeText(existing.contactNumber) === normalizeText(player.contactNumber)
    );
  });

  if (duplicate) {
    throw httpError(400, 'Player already exists in this team');
  }

  team.players.push(player);
  await team.save();
  res.status(201).json(serializeTeam(team));
});

exports.removePlayer = asyncHandler(async (req, res) => {
  const team = await findTeamOrThrow(req.params.ownerId, req.params.teamId);
  const before = team.players.length;
  team.players = team.players.filter(
    (player) => player._id.toString() !== req.params.playerId,
  );

  if (team.players.length === before) {
    throw httpError(404, 'Player not found');
  }

  await team.save();
  res.json(serializeTeam(team));
});